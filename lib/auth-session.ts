import {
  ApiError,
  apiEndpoints,
  type AdminUser,
  type ApiOptions,
  type LoginCredentials,
  type createApiClient,
} from "./api.ts";

export const AUTH_STORAGE_KEY = "islasource-admin-auth-v1";
type StoredGrant = { access_token: string; expires_at: string };
type SessionStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type AuthSnapshot = {
  status: "checking" | "anonymous" | "authenticated" | "unavailable";
  user: AdminUser | null;
  message: string;
  busy: boolean;
};

export function safeReturnPath(value: string | null): string {
  if (
    !value?.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u001f]/.test(value)
  )
    return "/";
  try {
    const url = new URL(value, "https://admin.example");
    if (
      url.origin !== "https://admin.example" ||
      url.pathname.startsWith("/login")
    )
      return "/";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/";
  }
}

export function createAuthSession(
  api: ReturnType<typeof createApiClient>,
  getStorage: () => SessionStorage,
) {
  const initial: AuthSnapshot = {
    status: "checking",
    user: null,
    message: "",
    busy: false,
  };
  let snapshot = initial;
  let grant: StoredGrant | null = null;
  let generation = 0;
  let active: AbortController | null = null;
  let expiryTimer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<() => void>();

  function publish(
    status: AuthSnapshot["status"],
    user: AdminUser | null,
    message = "",
    busy = false,
  ) {
    snapshot = { status, user, message, busy };
    listeners.forEach((listener) => listener());
  }

  function persist(value: StoredGrant | null) {
    try {
      if (value) getStorage().setItem(AUTH_STORAGE_KEY, JSON.stringify(value));
      else getStorage().removeItem(AUTH_STORAGE_KEY);
    } catch {
      // A blocked storage policy leaves authentication in memory for this page.
    }
  }

  function readGrant(): StoredGrant | null {
    try {
      const raw = getStorage().getItem(AUTH_STORAGE_KEY);
      if (!raw) return null;
      const saved = JSON.parse(raw);
      if (
        saved &&
        typeof saved.access_token === "string" &&
        saved.access_token &&
        typeof saved.expires_at === "string" &&
        Date.parse(saved.expires_at) > Date.now()
      ) {
        return {
          access_token: saved.access_token,
          expires_at: saved.expires_at,
        };
      }
      persist(null);
    } catch {
      persist(null);
    }
    return null;
  }

  function cancelTimer() {
    clearTimeout(expiryTimer);
    expiryTimer = undefined;
  }

  function begin() {
    generation++;
    active?.abort();
    active = new AbortController();
    return generation;
  }

  function invalidate(message: string) {
    begin();
    cancelTimer();
    grant = null;
    persist(null);
    publish("anonymous", null, message);
  }

  function armExpiry() {
    cancelTimer();
    if (!grant) return;
    const remaining = Date.parse(grant.expires_at) - Date.now();
    if (remaining <= 0) {
      invalidate("Your sign-in has expired. Please sign in again.");
      return;
    }
    expiryTimer = setTimeout(armExpiry, Math.min(remaining, 2_147_483_647));
  }

  async function verify(background = false) {
    if (background && snapshot.status !== "authenticated") return;
    const previousUser = background ? snapshot.user : null;
    const attempt = begin();
    grant ??= readGrant();
    if (!grant) {
      publish("anonymous", null);
      return;
    }
    armExpiry();
    if (attempt !== generation) return;
    if (!background) publish("checking", null);
    try {
      const user = await api.me(grant.access_token, active!.signal);
      if (attempt === generation) publish("authenticated", user);
    } catch (error) {
      if (attempt !== generation) return;
      if (error instanceof ApiError && [401, 403].includes(error.status)) {
        invalidate(
          error.status === 403
            ? "Your account can’t access this workspace. Please sign in again."
            : "Your sign-in has expired. Please sign in again.",
        );
      } else if (previousUser) {
        publish("authenticated", previousUser);
      } else {
        publish(
          "unavailable",
          null,
          "We couldn’t verify your sign-in. Please check your connection and try again.",
        );
      }
    }
  }

  async function login(credentials: LoginCredentials): Promise<boolean> {
    const attempt = begin();
    cancelTimer();
    grant = null;
    persist(null);
    publish("anonymous", null, "", true);
    try {
      const result = await api.login(credentials, active!.signal);
      if (attempt !== generation) return false;
      if (Date.parse(result.expires_at) <= Date.now())
        throw new ApiError(
          401,
          "Your sign-in has expired. Please sign in again.",
        );
      grant = {
        access_token: result.access_token,
        expires_at: result.expires_at,
      };
      persist(grant);
      publish("authenticated", result.user);
      armExpiry();
      return true;
    } catch (error) {
      if (attempt !== generation) return false;
      publish("anonymous", null);
      throw error;
    }
  }

  async function logout(): Promise<void> {
    const token = grant?.access_token;
    const attempt = begin();
    cancelTimer();
    grant = null;
    persist(null);
    publish("anonymous", null, "", Boolean(token));
    let message = "You’re signed out.";
    if (token) {
      try {
        await api.request(apiEndpoints.authLogout, {
          method: "POST",
          token,
          keepalive: true,
        });
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 401)) {
          message =
            "Signed out on this device. We couldn’t confirm sign-out with the server.";
        }
      }
    }
    if (attempt === generation) publish("anonymous", null, message);
  }

  async function request<T>(
    path: string,
    options: ApiOptions = {},
  ): Promise<T> {
    if (
      snapshot.status !== "authenticated" ||
      !grant ||
      Date.parse(grant.expires_at) <= Date.now()
    ) {
      invalidate("Please sign in to continue.");
      throw new ApiError(401, "Please sign in to continue.");
    }
    const token = grant.access_token;
    try {
      return await api.request<T>(path, { ...options, token });
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.status === 401 &&
        grant?.access_token === token
      ) {
        invalidate("Your sign-in has expired. Please sign in again.");
      }
      throw error;
    }
  }

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => initial,
    restore: () => verify(),
    recheck: () => verify(true),
    login,
    logout,
    request,
    dispose() {
      generation++;
      active?.abort();
      cancelTimer();
    },
  };
}

export type AdminSessionToken = {
  id: number;
  device_name: string;
  is_current: boolean;
  created_at: string | null;
  last_used_at: string | null;
  expires_at: string | null;
};

export function createSecurityClient(
  request: ReturnType<typeof createApiClient>["request"],
) {
  return {
    changePassword: (payload: {
      current_password: string;
      password: string;
      password_confirmation: string;
    }) =>
      request<void>(apiEndpoints.authPassword, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    async listTokens(): Promise<AdminSessionToken[]> {
      const result = await request<{ data: AdminSessionToken[] }>(
        apiEndpoints.authTokens,
      );
      return result.data;
    },
    revokeToken: (id: number) =>
      request<void>(apiEndpoints.authToken(id), { method: "DELETE" }),
    logoutAll: () =>
      request<void>(apiEndpoints.authLogoutAll, { method: "POST" }),
  };
}

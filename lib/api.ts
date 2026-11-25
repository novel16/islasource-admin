export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
)
  .replace(/\/+$/, "")
  .replace(/\/api\/v1$/i, "");

export const API_V1_URL = `${API_BASE_URL}/api/v1`;

export const apiEndpoints = {
  authLogin: "/admin/auth/login",
  authMe: "/admin/auth/me",
  authLogout: "/admin/auth/logout",
  products: "/admin/products",
  product: (id: number | string) =>
    `/admin/products/${encodeURIComponent(String(id))}`,
  productRestore: (id: number) => `/admin/products/${id}/restore`,
  productImages: "/admin/product-images",
  rfqs: "/admin/rfqs",
  rfq: (id: number) => `/admin/rfqs/${id}`,
  rfqNotes: (id: number) => `/admin/rfqs/${id}/notes`,
  rfqSupplyNotice: (id: number) => `/admin/rfqs/${id}/supply-notice`,
  rfqQuotations: (id: number) => `/admin/rfqs/${id}/quotations`,
  quotations: "/admin/quotations",
  quotation: (id: number) => `/admin/quotations/${id}`,
  quotationSend: (id: number) => `/admin/quotations/${id}/send`,
  quotationResend: (id: number) => `/admin/quotations/${id}/resend`,
  quotationCancel: (id: number) => `/admin/quotations/${id}/cancel`,
  quotationRevise: (id: number) => `/admin/quotations/${id}/revise`,
  orders: "/admin/orders",
  order: (id: number) => `/admin/orders/${id}`,
  orderMessages: (id: number) => `/admin/orders/${id}/messages`,
} as const;

export type AdminUser = { id: number; name: string; email: string };
export type LoginCredentials = { email: string; password: string };
export type AuthGrant = {
  user: AdminUser;
  access_token: string;
  token_type: "Bearer";
  expires_at: string;
};
export type ApiOptions = RequestInit & { token?: string };

export class ApiError extends Error {
  status: number;
  errors: Record<string, string[]>;

  constructor(
    status: number,
    message: string,
    errors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseUser(value: unknown): AdminUser {
  if (
    !record(value) ||
    !Number.isInteger(value.id) ||
    typeof value.id !== "number" ||
    value.id < 1 ||
    typeof value.name !== "string" ||
    typeof value.email !== "string"
  ) {
    throw new ApiError(
      502,
      "We couldn’t verify your account. Please try again.",
    );
  }
  return { id: value.id, name: value.name, email: value.email };
}

export function createApiClient(
  baseUrl: string = API_BASE_URL,
  fetcher: typeof fetch = fetch,
) {
  const normalizedOrigin = baseUrl.replace(/\/+$/, "").replace(/\/api\/v1$/i, "");
  const base = new URL(`${normalizedOrigin}/api/v1/`);
  if (!["http:", "https:"].includes(base.protocol))
    throw new Error("Invalid API URL");

  async function request<T>(
    path: string,
    options: ApiOptions = {},
  ): Promise<T> {
    const url = new URL(path.replace(/^\//, ""), base);
    if (
      !path.startsWith("/") ||
      path.startsWith("//") ||
      url.origin !== base.origin ||
      !url.pathname.startsWith(base.pathname)
    ) {
      throw new ApiError(0, "The requested API address is not allowed.");
    }
    const { token, ...init } = options;
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    if (typeof init.body === "string" && !headers.has("Content-Type"))
      headers.set("Content-Type", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    let response: Response;
    try {
      response = await fetcher(url.toString(), {
        ...init,
        headers,
        credentials: "omit",
        cache: "no-store",
        redirect: "error",
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw error;
      throw new ApiError(
        0,
        "We couldn’t connect. Please check your connection and try again.",
      );
    }
    if (response.status === 204) return undefined as T;
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const errors: Record<string, string[]> = {};
      if (response.status < 500 && record(body) && record(body.errors)) {
        for (const [key, value] of Object.entries(body.errors)) {
          if (
            Array.isArray(value) &&
            value.every((item) => typeof item === "string")
          )
            errors[key] = value;
        }
      }
      const message =
        response.status < 500 &&
        record(body) &&
        typeof body.message === "string"
          ? body.message
          : "Something went wrong. Please try again in a moment.";
      throw new ApiError(response.status, message, errors);
    }
    if (body === null)
      throw new ApiError(
        502,
        "We couldn’t read the response. Please try again.",
      );
    return body as T;
  }

  return {
    request,
    async login(
      credentials: LoginCredentials,
      signal?: AbortSignal,
    ): Promise<AuthGrant> {
      const { data } = await request<{ data: unknown }>(
        apiEndpoints.authLogin,
        {
          method: "POST",
          signal,
          body: JSON.stringify({
            ...credentials,
            email: credentials.email.trim(),
            device_name: "IslaSource admin",
          }),
        },
      );
      if (
        !record(data) ||
        typeof data.access_token !== "string" ||
        !data.access_token ||
        data.token_type !== "Bearer" ||
        typeof data.expires_at !== "string" ||
        !Number.isFinite(Date.parse(data.expires_at))
      ) {
        throw new ApiError(
          502,
          "We couldn’t verify your sign-in. Please try again.",
        );
      }
      return {
        user: parseUser(data.user),
        access_token: data.access_token,
        token_type: "Bearer",
        expires_at: data.expires_at,
      };
    },
    async me(token: string, signal?: AbortSignal): Promise<AdminUser> {
      const { data } = await request<{ data: unknown }>(apiEndpoints.authMe, {
        token,
        signal,
      });
      return parseUser(data);
    },
  };
}

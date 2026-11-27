import assert from "node:assert/strict";
import test from "node:test";
import { ApiError, createApiClient } from "../lib/api.ts";
import {
  AUTH_STORAGE_KEY,
  createAuthSession,
  safeReturnPath,
} from "../lib/auth-session.ts";

const user = { id: 7, name: "Test Administrator", email: "admin@example.test" };
const credentials = { email: user.email, password: "  a secret passphrase  " };
const grant = {
  user,
  access_token: "7|test-token",
  token_type: "Bearer",
  expires_at: "2099-01-01T00:00:00.000000Z",
};
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status });

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

function setup(t, fetcher, storage = memoryStorage()) {
  const session = createAuthSession(
    createApiClient("http://api.example.test", fetcher),
    () => storage,
  );
  t.after(() => session.dispose());
  return { session, storage };
}

test("login sends JSON credentials without cookies or a bearer header", async () => {
  const client = createApiClient(
    "http://api.example.test/",
    async (url, init) => {
      assert.equal(url, "http://api.example.test/api/v1/admin/auth/login");
      assert.equal(init.method, "POST");
      assert.equal(init.credentials, "omit");
      assert.equal(init.cache, "no-store");
      assert.equal(init.redirect, "error");
      assert.equal(init.headers.get("Accept"), "application/json");
      assert.equal(init.headers.has("Authorization"), false);
      assert.deepEqual(JSON.parse(init.body), {
        ...credentials,
        device_name: "IslaSource admin",
      });
      return json({ data: grant });
    },
  );
  assert.deepEqual(await client.login(credentials), grant);
});

test("protected API requests attach the token only to the configured API", async () => {
  let calls = 0;
  const client = createApiClient(
    "http://api.example.test",
    async (url, init) => {
      calls++;
      assert.equal(url, "http://api.example.test/api/v1/admin/auth/me");
      assert.equal(init.headers.get("Authorization"), "Bearer 7|test-token");
      assert.equal(init.credentials, "omit");
      return json({ data: user });
    },
  );
  assert.deepEqual(await client.me(grant.access_token), user);
  await assert.rejects(
    client.request("https://untrusted.example/steal", {
      token: grant.access_token,
    }),
  );
  await assert.rejects(
    client.request("/../outside-api", { token: grant.access_token }),
  );
  assert.equal(calls, 1);
});

test("validation errors preserve field feedback while server failures stay generic", async () => {
  const client = createApiClient("http://api.example.test", async () =>
    json(
      {
        message: "The provided credentials are incorrect.",
        errors: { email: ["The provided credentials are incorrect."] },
      },
      422,
    ),
  );
  await assert.rejects(client.login(credentials), (error) => {
    assert.equal(error.status, 422);
    assert.deepEqual(error.errors.email, [
      "The provided credentials are incorrect.",
    ]);
    return true;
  });
  const broken = createApiClient("http://api.example.test", async () =>
    json({ message: "SQL details and private configuration" }, 500),
  );
  await assert.rejects(broken.login(credentials), (error) => {
    assert.equal(error.status, 500);
    assert.equal(error.message.includes("SQL"), false);
    return true;
  });
});

test("network failures and malformed successful responses become usable auth errors", async () => {
  const offline = createApiClient(
    "http://api.example.test",
    async () => {
      throw new TypeError("fetch failed");
    },
  );
  await assert.rejects(
    offline.login(credentials),
    (error) => error instanceof ApiError && error.status === 0,
  );
  const malformed = createApiClient(
    "http://api.example.test",
    async () => json({ data: { access_token: "broken" } }),
  );
  await assert.rejects(malformed.login(credentials), ApiError);
});

test("legacy demo entry never authenticates a session", async (t) => {
  const storage = memoryStorage();
  storage.setItem("bantayan-demo-entered", "true");
  const { session } = setup(
    t,
    () => {
      throw new Error("No API request should be needed");
    },
    storage,
  );
  await session.restore();
  assert.equal(session.getSnapshot().status, "anonymous");
  assert.equal(session.getSnapshot().user, null);
});

test("successful sign-in persists only the grant and exposes the API user", async (t) => {
  const { session, storage } = setup(t, async () => json({ data: grant }));
  await session.login(credentials);
  assert.equal(session.getSnapshot().status, "authenticated");
  assert.deepEqual(session.getSnapshot().user, user);
  assert.deepEqual(JSON.parse(storage.getItem(AUTH_STORAGE_KEY)), {
    access_token: grant.access_token,
    expires_at: grant.expires_at,
  });
  assert.equal(
    storage.getItem(AUTH_STORAGE_KEY).includes(credentials.password),
    false,
  );
});

test("restoration verifies a saved grant before exposing any user", async (t) => {
  const storage = memoryStorage();
  storage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({ ...grant, user: { name: "Forged profile" } }),
  );
  let finish;
  const { session } = setup(
    t,
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
    storage,
  );
  const restoring = session.restore();
  assert.equal(session.getSnapshot().status, "checking");
  assert.equal(session.getSnapshot().user, null);
  finish(json({ data: user }));
  await restoring;
  assert.deepEqual(session.getSnapshot().user, user);
});

for (const status of [401, 403]) {
  test(`restoration rejects ${status} and keeps unrelated sample data`, async (t) => {
    const storage = memoryStorage();
    storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(grant));
    storage.setItem("sample-data", "keep me");
    const { session } = setup(
      t,
      async () => json({ message: "Denied" }, status),
      storage,
    );
    await session.restore();
    assert.equal(session.getSnapshot().status, "anonymous");
    assert.equal(storage.getItem(AUTH_STORAGE_KEY), null);
    assert.equal(storage.getItem("sample-data"), "keep me");
  });
}

test("an offline restoration gates the workspace and can retry the same token", async (t) => {
  let offline = true;
  const storage = memoryStorage();
  storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(grant));
  const { session } = setup(
    t,
    async () => {
      if (offline) throw new TypeError("offline");
      return json({ data: user });
    },
    storage,
  );
  await session.restore();
  assert.equal(session.getSnapshot().status, "unavailable");
  assert.notEqual(storage.getItem(AUTH_STORAGE_KEY), null);
  offline = false;
  await session.restore();
  assert.equal(session.getSnapshot().status, "authenticated");
});

test("logout clears local auth immediately and revokes the captured bearer token", async (t) => {
  let logoutToken;
  const { session, storage } = setup(t, async (url, init) => {
    if (url.endsWith("/logout")) {
      logoutToken = init.headers.get("Authorization");
      return new Response(null, { status: 204 });
    }
    return json({ data: grant });
  });
  storage.setItem("sample-data", "keep me");
  await session.login(credentials);
  const signingOut = session.logout();
  assert.equal(session.getSnapshot().user, null);
  assert.equal(storage.getItem(AUTH_STORAGE_KEY), null);
  await signingOut;
  assert.equal(logoutToken, "Bearer 7|test-token");
  assert.equal(session.getSnapshot().status, "anonymous");
  assert.equal(storage.getItem("sample-data"), "keep me");
});

test("failed server logout still clears this device and explains the result", async (t) => {
  const { session, storage } = setup(t, async (url) => {
    if (url.endsWith("/logout")) throw new TypeError("offline");
    return json({ data: grant });
  });
  await session.login(credentials);
  await session.logout();
  assert.equal(session.getSnapshot().status, "anonymous");
  assert.equal(storage.getItem(AUTH_STORAGE_KEY), null);
  assert.match(session.getSnapshot().message, /this device/);
});

test("a protected 401 signs out while a permission-only 403 keeps the session", async (t) => {
  let responseStatus = 403;
  const { session } = setup(t, async (url) =>
    url.endsWith("/login")
      ? json({ data: grant })
      : json({ message: "Denied" }, responseStatus),
  );
  await session.login(credentials);
  await assert.rejects(
    session.request("/protected"),
    (error) => error.status === 403,
  );
  assert.equal(session.getSnapshot().status, "authenticated");
  responseStatus = 401;
  await assert.rejects(
    session.request("/protected"),
    (error) => error.status === 401,
  );
  assert.equal(session.getSnapshot().status, "anonymous");
});

test("a late 401 from an older token cannot clear a newer login", async (t) => {
  let finish;
  let loginCount = 0;
  const { session } = setup(t, (url) => {
    if (url.endsWith("/login"))
      return Promise.resolve(
        json({ data: { ...grant, access_token: `${++loginCount}|token` } }),
      );
    return new Promise((resolve) => {
      finish = resolve;
    });
  });
  await session.login(credentials);
  const oldRequest = session.request("/protected");
  await session.login(credentials);
  finish(json({ message: "Expired" }, 401));
  await assert.rejects(oldRequest);
  assert.equal(session.getSnapshot().status, "authenticated");
});

test("expiry removes access without waiting for another API request", async (t) => {
  t.mock.timers.enable({
    apis: ["setTimeout", "Date"],
    now: new Date("2026-11-13T00:00:00Z"),
  });
  const { session, storage } = setup(t, async () =>
    json({ data: { ...grant, expires_at: "2026-11-13T00:00:02Z" } }),
  );
  await session.login(credentials);
  t.mock.timers.tick(2001);
  assert.equal(session.getSnapshot().status, "anonymous");
  assert.equal(storage.getItem(AUTH_STORAGE_KEY), null);
});

test("unavailable browser storage falls back to the current page session", async (t) => {
  const { session } = setup(t, async () => json({ data: grant }), {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
    removeItem() {
      throw new Error("blocked");
    },
  });
  await session.login(credentials);
  assert.equal(session.getSnapshot().status, "authenticated");
  await session.logout();
  assert.equal(session.getSnapshot().status, "anonymous");
});

test("return destinations accept internal pages and reject external or looping URLs", () => {
  assert.equal(
    safeReturnPath("/orders/ORD-2026-001?tab=history"),
    "/orders/ORD-2026-001?tab=history",
  );
  for (const unsafe of [
    null,
    "https://untrusted.example",
    "//untrusted.example",
    "/\\untrusted.example",
    "javascript:alert(1)",
    "/login?next=/login",
  ]) {
    assert.equal(safeReturnPath(unsafe), "/");
  }
});

test("security client calls password change, token list, token revoke, and logout-all endpoints", async () => {
  const { createSecurityClient } = await import("../lib/auth-session.ts");
  const calls = [];
  const security = createSecurityClient(async (path, options = {}) => {
    calls.push({ path, options });
    if (path === "/admin/auth/tokens" && !options.method) {
      return {
        data: [
          {
            id: 4,
            device_name: "IslaSource admin",
            is_current: true,
            created_at: "2026-11-27T01:00:00Z",
            last_used_at: null,
            expires_at: "2026-11-27T13:00:00Z",
          },
        ],
      };
    }
    return undefined;
  });

  await security.changePassword({
    current_password: "old-password",
    password: "new-password-123",
    password_confirmation: "new-password-123",
  });
  assert.equal(calls[0].path, "/admin/auth/password");
  assert.equal(calls[0].options.method, "POST");

  const tokens = await security.listTokens();
  assert.equal(tokens.length, 1);
  assert.equal(tokens[0].is_current, true);

  await security.revokeToken(9);
  assert.equal(calls[2].path, "/admin/auth/tokens/9");
  assert.equal(calls[2].options.method, "DELETE");

  await security.logoutAll();
  assert.equal(calls[3].path, "/admin/auth/logout-all");
  assert.equal(calls[3].options.method, "POST");
});

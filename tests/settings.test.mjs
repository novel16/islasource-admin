import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createSettingsClient, siteAssetSrc } from "../lib/settings.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("siteAssetSrc resolves built-in images and API storage uploads while rejecting untrusted URLs", () => {
  assert.equal(
    siteAssetSrc("/images/hero-seafood.jpg", "http://127.0.0.1:8000"),
    "/images/hero-seafood.jpg",
  );
  assert.equal(
    siteAssetSrc("/images/island.jpg", "http://127.0.0.1:8000"),
    "/images/island.jpg",
  );
  assert.equal(
    siteAssetSrc("/storage/products/hero_123.webp", "http://127.0.0.1:8000"),
    "http://127.0.0.1:8000/storage/products/hero_123.webp",
  );
  assert.equal(
    siteAssetSrc("https://evil.example/a.jpg", "http://127.0.0.1:8000"),
    "/images/hero-seafood.jpg",
  );
});

test("createSettingsClient calls GET, PUT, and POST reset endpoints", async () => {
  const calls = [];
  const client = createSettingsClient(async (url, init = {}) => {
    calls.push({ url, method: init.method ?? "GET", body: init.body });
    return { data: { business_name: "IslaSource Seafoods" } };
  });

  await client.get();
  await client.update({ business_name: "Updated" });
  await client.reset();

  assert.deepEqual(
    calls.map((c) => ({ url: c.url, method: c.method })),
    [
      { url: "/admin/settings", method: "GET" },
      { url: "/admin/settings", method: "PUT" },
      { url: "/admin/settings/reset", method: "POST" },
    ],
  );
});

test("workspace-provider no longer stores settings in browser localStorage", () => {
  const providerSource = fs.readFileSync(
    path.join(__dirname, "../components/workspace-provider.tsx"),
    "utf8",
  );
  assert.equal(providerSource.includes("islasource-admin-settings"), false);
  assert.equal(providerSource.includes("localStorage"), false);
});

import assert from "node:assert/strict";
import test from "node:test";
import { ApiError } from "../lib/api.ts";
import { handleDialogCancel } from "../lib/dialog.ts";
import {
  createProductsClient,
  blankProduct,
  productPayload,
  productListPath,
  productImageSrc,
  slugFromName,
  workspaceSearchResults,
} from "../lib/products.ts";

test("product queries encode search and validated filter values without trusting page URLs", () => {
  const url = new URL(
    productListPath({
      search: "crab & squid",
      category: "Fresh seafood",
      status: "Published",
      archived: true,
      page: 2,
      per_page: 15,
    }),
    "https://api.example",
  );
  assert.equal(url.pathname, "/admin/products");
  assert.equal(url.searchParams.get("search"), "crab & squid");
  assert.equal(url.searchParams.get("category"), "Fresh seafood");
  assert.equal(url.searchParams.get("status"), "Published");
  assert.equal(url.searchParams.get("archived"), "1");
  assert.equal(url.searchParams.get("page"), "2");
  assert.equal(url.searchParams.get("per_page"), "15");
  const all = new URL(
    productListPath({ category: "All", status: "All" }),
    "https://api.example",
  );
  assert.equal(all.searchParams.has("category"), false);
  assert.equal(all.searchParams.has("status"), false);
});

test("save payload includes product and SEO fields and excludes server-owned attributes", () => {
  const payload = productPayload({
    ...blankProduct,
    id: 991,
    deleted_at: "forged",
    previous_slugs: ["reserved"],
    created_at: "forged",
    name: "  Scallops  ",
    slug: "  SEA-SCALLOPS ",
    min_order_quantity: "1.250",
    canonical_url: " https://example.com/seafood/scallops ",
  });
  assert.equal(payload.name, "Scallops");
  assert.equal(payload.slug, "sea-scallops");
  assert.equal(payload.min_order_quantity, "1.250");
  assert.equal(payload.canonical_url, "https://example.com/seafood/scallops");
  for (const key of ["id", "deleted_at", "created_at", "previous_slugs"])
    assert.equal(key in payload, false);
  assert.equal(payload.availability_note.includes("confirmed"), true);
  assert.equal("price" in payload, false);
  assert.equal("stock" in payload, false);
});

test("product saves use create or partial-update endpoints and return server identity", async () => {
  const calls = [];
  const client = createProductsClient(async (path, options) => {
    calls.push({ path, options });
    return { data: { id: 42, name: "Saved product" } };
  });
  assert.equal((await client.save(blankProduct)).id, 42);
  assert.equal((await client.save(blankProduct, 42)).id, 42);
  assert.equal(calls[0].path, "/admin/products");
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[1].path, "/admin/products/42");
  assert.equal(calls[1].options.method, "PATCH");
  assert.equal(JSON.parse(calls[1].options.body).status, "Draft");
});

test("product requests preserve server validation feedback", async () => {
  const failure = new ApiError(422, "The slug has already been taken.", {
    slug: ["The slug has already been taken."],
  });
  const client = createProductsClient(async () => {
    throw failure;
  });
  await assert.rejects(client.save(blankProduct), (error) => error === failure);
});

test("archive and restore use recoverable product routes", async () => {
  const calls = [];
  const client = createProductsClient(async (path, options) => {
    calls.push([path, options.method]);
    return options.method === "POST"
      ? { data: { id: 42, deleted_at: null } }
      : undefined;
  });
  await client.archive(42);
  assert.equal((await client.restore(42)).deleted_at, null);
  assert.deepEqual(calls, [
    ["/admin/products/42", "DELETE"],
    ["/admin/products/42/restore", "POST"],
  ]);
});

test("image uploads use FormData and do not manually set a multipart boundary", async () => {
  const client = createProductsClient(async (path, options) => {
    assert.equal(path, "/admin/product-images");
    assert.equal(options.method, "POST");
    assert.equal(options.body instanceof FormData, true);
    assert.equal(options.body.get("image").name, "scallops.jpg");
    assert.equal(options.headers, undefined);
    return { data: { image: "/storage/products/generated.jpg" } };
  });
  const file = new File(["sample test bytes"], "scallops.jpg", {
    type: "image/jpeg",
  });
  assert.equal(await client.upload(file), "/storage/products/generated.jpg");
});

test("unsupported or oversized image input never reaches the upload endpoint", async () => {
  let called = false;
  const client = createProductsClient(async () => {
    called = true;
  });
  await assert.rejects(
    client.upload(new File(["<svg/>"], "image.svg", { type: "image/svg+xml" })),
    ApiError,
  );
  await assert.rejects(
    client.upload(
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.png", {
        type: "image/png",
      }),
    ),
    ApiError,
  );
  assert.equal(called, false);
});

test("product images resolve only supplied assets and the configured API upload directory", () => {
  assert.equal(
    productImageSrc("/images/crab.jpg", "http://127.0.0.1:8000/api/v1"),
    "/images/crab.jpg",
  );
  assert.equal(
    productImageSrc(
      "/storage/products/generated.jpg",
      "http://127.0.0.1:8000/api/v1",
    ),
    "http://127.0.0.1:8000/storage/products/generated.jpg",
  );
  for (const bad of [
    "https://untrusted.example/image.jpg",
    "/storage/../private.jpg",
    "/storage/products/../../private.jpg",
    "javascript:alert(1)",
  ]) {
    assert.equal(
      productImageSrc(bad, "https://api.example/api/v1"),
      "/images/squid.jpg",
    );
  }
});

test("global catalog search keeps server slug and category matches", () => {
  const local = [{ label: "Overview", href: "/" }];
  const catalog = [{ id: 42, name: "Whole squid" }];
  assert.deepEqual(workspaceSearchResults(local, catalog, "whole-squid"), [{ label: "Whole squid", href: "/products/42" }]);
  assert.deepEqual(workspaceSearchResults(local, catalog, "Fresh seafood"), [{ label: "Whole squid", href: "/products/42" }]);
});

test("Escape cancel preserves a busy modal until React accepts close", () => {
  let open = true;
  let busy = true;
  const onClose = () => { if (!busy) open = false; };
  const blocked = new Event("cancel", { cancelable: true });
  handleDialogCancel(blocked, onClose);
  assert.equal(blocked.defaultPrevented, true);
  assert.equal(open, true);
  busy = false;
  const allowed = new Event("cancel", { cancelable: true });
  handleDialogCancel(allowed, onClose);
  assert.equal(allowed.defaultPrevented, true);
  assert.equal(open, false);
});

test("name-to-slug handles punctuation, accents and whitespace", () => {
  assert.equal(
    slugFromName("  Premium Dried Squid & Fish!  "),
    "premium-dried-squid-fish",
  );
  assert.equal(slugFromName("Café seafood"), "cafe-seafood");
  assert.equal(slugFromName("---"), "");
});

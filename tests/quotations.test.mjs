import assert from "node:assert/strict";
import test from "node:test";
import {
  createQuotationsClient,
  previewQuotationTotals,
  quotationListPath,
  quotationStatuses,
} from "../lib/quotations.ts";

test("quotation list query encodes search, status, rfq_id, and pagination while omitting All status", () => {
  assert.deepEqual(quotationStatuses, [
    "Draft",
    "Sent",
    "Accepted",
    "Declined",
    "Expired",
    "Superseded",
    "Cancelled",
  ]);
  const url = new URL(
    quotationListPath({
      search: "QT-2026 & maia",
      status: "Sent",
      rfq_id: 9,
      page: 2,
      per_page: 20,
    }),
    "https://api.example",
  );
  assert.equal(url.pathname, "/admin/quotations");
  assert.equal(url.searchParams.get("search"), "QT-2026 & maia");
  assert.equal(url.searchParams.get("status"), "Sent");
  assert.equal(url.searchParams.get("rfq_id"), "9");
  assert.equal(url.searchParams.get("page"), "2");
  assert.equal(url.searchParams.get("per_page"), "20");

  const all = new URL(
    quotationListPath({ status: "All", search: "  " }),
    "https://api.example",
  );
  assert.equal(all.searchParams.has("status"), false);
  assert.equal(all.searchParams.has("search"), false);
});

test("previewQuotationTotals matches Laravel centavo calculation and largest-remainder selling allocation", () => {
  const single = previewQuotationTotals({
    items: [{ quantity: 5, unit_cost_centavos: 50_000, is_available: true }],
    handling_centavos: 20_000,
    markup_percent: 20,
    delivery_centavos: 35_000,
    deposit_percent: 50,
  });
  assert.deepEqual(single, {
    items: [{ line_cost_centavos: 250_000, line_selling_centavos: 324_000 }],
    seafood_cost_centavos: 250_000,
    handling_centavos: 20_000,
    markup_centavos: 54_000,
    subtotal_centavos: 324_000,
    delivery_centavos: 35_000,
    total_centavos: 359_000,
    deposit_centavos: 179_500,
    balance_centavos: 179_500,
  });

  const multi = previewQuotationTotals({
    items: [
      { quantity: 1, unit_cost_centavos: 10_000, is_available: true },
      { quantity: 1, unit_cost_centavos: 10_000, is_available: true },
      { quantity: 1, unit_cost_centavos: 10_000, is_available: true },
      { quantity: 2.5, unit_cost_centavos: 45_000, is_available: false },
    ],
    handling_centavos: 100,
    markup_percent: 0,
    delivery_centavos: 25_000,
    deposit_percent: 33,
  });
  assert.equal(multi.subtotal_centavos, 30_100);
  assert.equal(multi.items[0].line_selling_centavos, 10_034);
  assert.equal(multi.items[1].line_selling_centavos, 10_033);
  assert.equal(multi.items[2].line_selling_centavos, 10_033);
  assert.deepEqual(multi.items[3], {
    line_cost_centavos: 0,
    line_selling_centavos: 0,
  });
  assert.equal(multi.deposit_centavos + multi.balance_centavos, multi.total_centavos);
});

test("quotations client calls create, update, discard, send, resend, cancel, and revise routes", async () => {
  const calls = [];
  const client = createQuotationsClient(async (path, options) => {
    calls.push({ path, method: options?.method ?? "GET", body: options?.body });
    if (options?.method === "DELETE") return undefined;
    return { data: { id: 15, status: "Draft" } };
  });

  await client.createForRfq(7, { validity_hours: 48, deposit_percent: 50 });
  await client.update(15, {
    handling_centavos: 20_000,
    markup_percent: "20.00",
    delivery_centavos: 35_000,
    deposit_percent: 50,
    validity_hours: 48,
    terms: "Standard terms.",
    items: [
      {
        id: 1,
        quantity: "5.000",
        specs: "Medium",
        is_available: true,
        unit_cost_centavos: 50_000,
      },
    ],
  });
  await client.send(15);
  await client.resend(15);
  await client.cancel(15, "Sold out");
  await client.revise(15);
  await client.discard(15);

  assert.deepEqual(
    calls.map((c) => [c.method, c.path]),
    [
      ["POST", "/admin/rfqs/7/quotations"],
      ["PATCH", "/admin/quotations/15"],
      ["POST", "/admin/quotations/15/send"],
      ["POST", "/admin/quotations/15/resend"],
      ["POST", "/admin/quotations/15/cancel"],
      ["POST", "/admin/quotations/15/revise"],
      ["DELETE", "/admin/quotations/15"],
    ],
  );
  assert.deepEqual(JSON.parse(calls[4].body), { reason: "Sold out" });
});

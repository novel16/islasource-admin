import assert from "node:assert/strict";
import test from "node:test";
import {
  createOrdersClient,
  nextOrderStatus,
  orderListPath,
  orderStatuses,
} from "../lib/orders.ts";

test("order list query encodes search, status, payment_status, and pagination while omitting All", () => {
  assert.deepEqual(orderStatuses, [
    "Awaiting Payment",
    "Processing",
    "Packed",
    "Dispatched",
    "Completed",
    "Cancelled",
  ]);
  const filtered = new URL(
    orderListPath({
      search: "ORD-2026",
      status: "Processing",
      payment_status: "Paid",
      page: 2,
      per_page: 20,
    }),
    "https://api.example",
  );
  assert.equal(filtered.pathname, "/admin/orders");
  assert.equal(filtered.searchParams.get("search"), "ORD-2026");
  assert.equal(filtered.searchParams.get("status"), "Processing");
  assert.equal(filtered.searchParams.get("payment_status"), "Paid");
  assert.equal(filtered.searchParams.get("page"), "2");
  assert.equal(filtered.searchParams.get("per_page"), "20");

  const all = new URL(
    orderListPath({ status: "All", payment_status: "All", search: "  " }),
    "https://api.example",
  );
  assert.equal(all.searchParams.has("status"), false);
  assert.equal(all.searchParams.has("payment_status"), false);
  assert.equal(all.searchParams.has("search"), false);
});

test("nextOrderStatus allows fulfillment transitions only for paid orders", () => {
  assert.equal(
    nextOrderStatus({ status: "Awaiting Payment", payment_status: "Unpaid" }),
    null,
  );
  assert.equal(
    nextOrderStatus({ status: "Processing", payment_status: "Unpaid" }),
    null,
  );
  assert.equal(
    nextOrderStatus({ status: "Processing", payment_status: "Paid" }),
    "Packed",
  );
  assert.equal(
    nextOrderStatus({ status: "Packed", payment_status: "Paid" }),
    "Dispatched",
  );
  assert.equal(
    nextOrderStatus({ status: "Dispatched", payment_status: "Paid" }),
    "Completed",
  );
  assert.equal(
    nextOrderStatus({ status: "Completed", payment_status: "Paid" }),
    null,
  );
});

test("orders client updates status via PATCH with optional trimmed cancel reason", async () => {
  const calls = [];
  const client = createOrdersClient(async (path, options) => {
    calls.push({ path, options });
    return { data: { id: 9, status: "Packed", payment_status: "Paid" } };
  });

  const packed = await client.updateStatus(9, "Packed");
  assert.equal(packed.status, "Packed");
  assert.equal(calls[0].path, "/admin/orders/9");
  assert.equal(calls[0].options.method, "PATCH");
  assert.deepEqual(JSON.parse(calls[0].options.body), { status: "Packed" });

  await client.updateStatus(9, "Cancelled", "  Unpaid after expiry  ");
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    status: "Cancelled",
    cancel_reason: "Unpaid after expiry",
  });
});

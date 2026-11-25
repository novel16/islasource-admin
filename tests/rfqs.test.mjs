import assert from "node:assert/strict";
import test from "node:test";
import { ApiError } from "../lib/api.ts";
import {
  createRfqsClient,
  rfqListPath,
  rfqStatuses,
} from "../lib/rfqs.ts";

test("RFQ list query encodes search, status, and pagination while omitting All status", () => {
  assert.deepEqual(rfqStatuses, [
    "New",
    "Reviewing",
    "Waiting",
    "Ready",
    "Quoted",
    "Closed",
  ]);
  const filtered = new URL(
    rfqListPath({
      search: "maia & squid",
      status: "Reviewing",
      page: 2,
      per_page: 25,
    }),
    "https://api.example",
  );
  assert.equal(filtered.pathname, "/admin/rfqs");
  assert.equal(filtered.searchParams.get("search"), "maia & squid");
  assert.equal(filtered.searchParams.get("status"), "Reviewing");
  assert.equal(filtered.searchParams.get("page"), "2");
  assert.equal(filtered.searchParams.get("per_page"), "25");

  const all = new URL(
    rfqListPath({ status: "All", search: "   " }),
    "https://api.example",
  );
  assert.equal(all.searchParams.has("status"), false);
  assert.equal(all.searchParams.has("search"), false);
});

test("RFQ client updates status via PATCH and appends trimmed private notes via POST", async () => {
  const calls = [];
  const client = createRfqsClient(async (path, options) => {
    calls.push({ path, options });
    if (options.method === "PATCH") {
      return { data: { id: 12, status: "Ready", internal_notes: [] } };
    }
    return {
      data: {
        id: 7,
        body: "Checked market price",
        author_name: "Alex",
        created_at: "2026-11-23T10:00:00.000000Z",
      },
    };
  });

  const updated = await client.updateStatus(12, "Ready");
  assert.equal(updated.status, "Ready");
  assert.equal(calls[0].path, "/admin/rfqs/12");
  assert.equal(calls[0].options.method, "PATCH");
  assert.deepEqual(JSON.parse(calls[0].options.body), { status: "Ready" });

  const note = await client.addNote(12, "  Checked market price  ");
  assert.equal(note.id, 7);
  assert.equal(calls[1].path, "/admin/rfqs/12/notes");
  assert.equal(calls[1].options.method, "POST");
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    body: "Checked market price",
  });
});

test("RFQ client rejects empty or oversized notes before calling the API", async () => {
  let called = false;
  const client = createRfqsClient(async () => {
    called = true;
  });

  await assert.rejects(client.addNote(12, "   "), (error) => {
    assert.equal(error instanceof ApiError, true);
    assert.equal(error.status, 422);
    return true;
  });
  await assert.rejects(client.addNote(12, "a".repeat(2001)), (error) => {
    assert.equal(error instanceof ApiError, true);
    assert.equal(error.status, 422);
    return true;
  });
  assert.equal(called, false);
});

test("RFQ client sends supply reschedule and unavailable notices via POST", async () => {
  const calls = [];
  const client = createRfqsClient(async (path, options) => {
    calls.push({ path, options });
    return { data: { id: 12, status: "Waiting", schedule_status: "Proposed" } };
  });

  const updated = await client.sendSupplyNotice(12, {
    mode: "reschedule",
    proposed_available_date: "2026-12-01",
    proposed_delivery_date: "2026-12-02",
    notice: "  Fresh catch expected Tuesday  ",
  });
  assert.equal(updated.schedule_status, "Proposed");
  assert.equal(calls[0].path, "/admin/rfqs/12/supply-notice");
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    mode: "reschedule",
    proposed_available_date: "2026-12-01",
    proposed_delivery_date: "2026-12-02",
    notice: "Fresh catch expected Tuesday",
  });
});

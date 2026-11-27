import assert from "node:assert/strict";
import test from "node:test";
import { formatSalesReportCsv, salesReportPath } from "../lib/reports.ts";

test("salesReportPath builds clean query parameters for optional date ranges", () => {
  assert.equal(salesReportPath(), "/admin/reports/sales");
  assert.equal(
    salesReportPath({ from: "2026-11-01", to: "2026-11-30" }),
    "/admin/reports/sales?from=2026-11-01&to=2026-11-30",
  );
});

test("formatSalesReportCsv formats centavos to pesos and escapes CSV quotes cleanly", () => {
  const csv = formatSalesReportCsv([
    {
      id: 1,
      reference: "ORD-2026-ABCD1234",
      quotation_reference: "QT-2026-EFGH5678",
      customer_name: 'Maia "Island" Reyes',
      location: "Cebu City, Cebu",
      status: "Completed",
      paid_at: "2026-11-25T06:00:00.000000Z",
      seafood_cost_centavos: 100_000,
      handling_centavos: 10_000,
      delivery_centavos: 15_000,
      markup_percent: "20.00",
      net_profit_centavos: 22_000,
      gross_sales_centavos: 147_000,
    },
  ]);

  assert.match(
    csv,
    /^Order,Quotation,Paid At,Customer,Location,Status,Seafood Cost \(PHP\),Handling \(PHP\),Delivery \(PHP\),Markup %,Net Profit \(PHP\),Gross Sale \(PHP\)/,
  );
  assert.match(csv, /"Maia ""Island"" Reyes"/);
  assert.match(csv, /1000\.00,100\.00,150\.00,20\.00,220\.00,1470\.00/);
});

import { apiEndpoints } from "./api.ts";

export type ApiSalesSummary = {
  paid_orders_count: number;
  completed_orders_count: number;
  gross_sales_centavos: number;
  seafood_cost_centavos: number;
  handling_centavos: number;
  delivery_centavos: number;
  net_profit_centavos: number;
};

export type ApiTopProduct = {
  product_name: string;
  unit: "kg" | "pack" | "piece";
  orders_count: number;
  quantity: string;
  sales_centavos: number;
};

export type ApiSalesOrderRow = {
  id: number;
  reference: string;
  quotation_reference: string;
  customer_name: string;
  location: string;
  status: string;
  paid_at: string | null;
  seafood_cost_centavos: number;
  handling_centavos: number;
  delivery_centavos: number;
  markup_percent: string;
  net_profit_centavos: number;
  gross_sales_centavos: number;
};

export type ApiSalesReport = {
  data: {
    summary: ApiSalesSummary;
    top_products: ApiTopProduct[];
    orders: ApiSalesOrderRow[];
  };
};

export function salesReportPath(
  filters: { from?: string; to?: string } = {},
): string {
  const query = new URLSearchParams();
  if (filters.from?.trim()) query.set("from", filters.from.trim());
  if (filters.to?.trim()) query.set("to", filters.to.trim());
  const qs = query.toString();
  return qs ? `${apiEndpoints.reportsSales}?${qs}` : apiEndpoints.reportsSales;
}

function escapeCsv(value: string | number): string {
  const str = String(value ?? "");
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function pesos(centavos: number): string {
  return (centavos / 100).toFixed(2);
}

export function formatSalesReportCsv(orders: ApiSalesOrderRow[]): string {
  const headers = [
    "Order",
    "Quotation",
    "Paid At",
    "Customer",
    "Location",
    "Status",
    "Seafood Cost (PHP)",
    "Handling (PHP)",
    "Delivery (PHP)",
    "Markup %",
    "Net Profit (PHP)",
    "Gross Sale (PHP)",
  ];
  const lines = [headers.join(",")];
  for (const row of orders) {
    lines.push(
      [
        escapeCsv(row.reference),
        escapeCsv(row.quotation_reference),
        escapeCsv(row.paid_at ?? ""),
        escapeCsv(row.customer_name),
        escapeCsv(row.location),
        escapeCsv(row.status),
        pesos(row.seafood_cost_centavos),
        pesos(row.handling_centavos),
        pesos(row.delivery_centavos),
        escapeCsv(row.markup_percent),
        pesos(row.net_profit_centavos),
        pesos(row.gross_sales_centavos),
      ].join(","),
    );
  }
  return lines.join("\n");
}

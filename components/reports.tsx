"use client";

import Link from "next/link";
import { useState } from "react";
import { money } from "@/lib/data";
import {
  formatSalesReportCsv,
  salesReportPath,
  type ApiSalesReport,
} from "@/lib/reports";
import { useWorkspace } from "./workspace-provider";
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  PageHeader,
} from "./ui";
import { Icon } from "./ui/icon";
import { useApiResource } from "./use-api-resource";

type RangePreset = "all" | "today" | "7d" | "month" | "custom";

function isoDateManila(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatPaidAt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function Reports() {
  const { notify } = useWorkspace();
  const [preset, setPreset] = useState<RangePreset>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const path = salesReportPath({ from, to });
  const { data, error, loading, retry } = useApiResource<ApiSalesReport>(path);

  const summary = data?.data.summary;
  const orders = data?.data.orders ?? [];
  const topProducts = data?.data.top_products ?? [];

  function applyPreset(next: RangePreset) {
    setPreset(next);
    const now = new Date();
    const today = isoDateManila(now);

    if (next === "all") {
      setFrom("");
      setTo("");
      return;
    }
    if (next === "today") {
      setFrom(today);
      setTo(today);
      return;
    }
    if (next === "7d") {
      const start = new Date(now.getTime() - 6 * 86_400_000);
      setFrom(isoDateManila(start));
      setTo(today);
      return;
    }
    if (next === "month") {
      setFrom(`${today.slice(0, 7)}-01`);
      setTo(today);
    }
  }

  function exportCsv() {
    if (!orders.length) return;
    const csv = formatSalesReportCsv(orders);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `islasource-sales${from ? `-${from}` : ""}${to ? `-to-${to}` : ""}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    notify("Sales CSV downloaded.");
  }

  const paidCount = summary?.paid_orders_count ?? 0;
  const completedCount = summary?.completed_orders_count ?? 0;
  const inProgressCount = Math.max(0, paidCount - completedCount);

  return (
    <>
      <PageHeader
        eyebrow="FINANCIAL & SALES TRACKING"
        title="Sales reports"
        description="Verified QR Ph sales broken down into gross sales, net markup profit, seafood base cost, handling, and delivery."
        actions={
          <Button
            variant="secondary"
            disabled={!orders.length}
            onClick={exportCsv}
          >
            <Icon name="file" size={16} />
            Export CSV
          </Button>
        }
      />

      <Card className="share-card">
        <div
          className="list-toolbar"
          style={{ flexWrap: "wrap", alignItems: "center" }}
        >
          <div className="preset-buttons" role="group" aria-label="Date range">
            {(
              [
                { id: "all", label: "All time" },
                { id: "today", label: "Today" },
                { id: "7d", label: "Last 7 days" },
                { id: "month", label: "This month" },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                className={preset === item.id ? "selected" : ""}
                onClick={() => applyPreset(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <label className="small-text muted" htmlFor="report-from">
              From
            </label>
            <input
              id="report-from"
              type="date"
              aria-label="From date"
              value={from}
              max={to || undefined}
              onChange={(event) => {
                setPreset("custom");
                setFrom(event.target.value);
              }}
              style={{ width: "auto" }}
            />
            <label className="small-text muted" htmlFor="report-to">
              To
            </label>
            <input
              id="report-to"
              type="date"
              aria-label="To date"
              value={to}
              min={from || undefined}
              onChange={(event) => {
                setPreset("custom");
                setTo(event.target.value);
              }}
              style={{ width: "auto" }}
            />
          </div>
        </div>
      </Card>

      <div className="stat-grid">
        {[
          {
            label: "Gross sales",
            value: loading ? "—" : money(summary?.gross_sales_centavos ?? 0),
            icon: "wallet",
            note: `${paidCount} paid ${paidCount === 1 ? "order" : "orders"}`,
            detail: "Total QR Ph payments collected",
            color: "blue",
          },
          {
            label: "Net profit (markup)",
            value: loading ? "—" : money(summary?.net_profit_centavos ?? 0),
            icon: "trend",
            note: "Your markup / interest earned",
            detail: "Excludes base seafood cost, handling & delivery",
            color: "mint",
          },
          {
            label: "Handling & packing",
            value: loading ? "—" : money(summary?.handling_centavos ?? 0),
            icon: "box",
            note: "Separated packing allocation",
            detail: "Ice, coolers, and island packing",
            color: "sand",
          },
          {
            label: "Delivery collected",
            value: loading ? "—" : money(summary?.delivery_centavos ?? 0),
            icon: "bag",
            note: "Separated delivery fees",
            detail: "Port, bus cargo, or courier fees",
            color: "peach",
          },
        ].map((card) => (
          <div className="stat-card" key={card.label}>
            <div className="stat-top">
              <span>{card.label}</span>
              <div className={`stat-icon ${card.color}`}>
                <Icon name={card.icon} size={19} />
              </div>
            </div>
            <strong className="stat-value" style={{ fontSize: 26 }}>
              {card.value}
            </strong>
            <div className="stat-note">
              <Icon name="trend" size={14} />
              {card.note}
            </div>
            <small>{card.detail}</small>
          </div>
        ))}
      </div>

      <div className="summary-strip">
        <span>
          <strong>
            {loading ? "—" : money(summary?.seafood_cost_centavos ?? 0)}
          </strong>
          Seafood base cost (supplier capital)
        </span>
        <span>
          <strong>{loading ? "—" : String(paidCount).padStart(2, "0")}</strong>
          Paid orders
        </span>
        <span>
          <strong>
            {loading ? "—" : String(completedCount).padStart(2, "0")}
          </strong>
          Completed & delivered
        </span>
        <span>
          <strong>
            {loading ? "—" : String(inProgressCount).padStart(2, "0")}
          </strong>
          Paid & in fulfillment
        </span>
      </div>

      {error ? (
        <Card>
          <div className="empty-state">
            <Icon name="trend" size={30} />
            <h3>Couldn’t load sales report</h3>
            <p>{error.message}</p>
            <Button variant="secondary" onClick={retry}>
              Try again
            </Button>
          </div>
        </Card>
      ) : (
        <div className="dashboard-middle">
          <Card
            title="Paid orders breakdown"
            subtitle="Exact centavo split for each paid order"
          >
            {loading ? (
              <p className="loading-text">Loading paid sales…</p>
            ) : orders.length ? (
              <DataTable
                headers={[
                  "Order",
                  "Customer",
                  "Base cost",
                  "Handling",
                  "Delivery",
                  "Net profit",
                  "Gross sale",
                  "Status",
                ]}
              >
                {orders.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link
                        className="table-primary"
                        href={`/orders/${row.id}`}
                      >
                        {row.reference}
                      </Link>
                      <small>{formatPaidAt(row.paid_at)}</small>
                    </td>
                    <td>
                      <strong>{row.customer_name}</strong>
                      <small>{row.location}</small>
                    </td>
                    <td className="money">{money(row.seafood_cost_centavos)}</td>
                    <td className="money">{money(row.handling_centavos)}</td>
                    <td className="money">{money(row.delivery_centavos)}</td>
                    <td className="money">
                      {money(row.net_profit_centavos)}
                      <small>{Number(row.markup_percent)}% markup</small>
                    </td>
                    <td className="money">{money(row.gross_sales_centavos)}</td>
                    <td>
                      <Badge>{row.status}</Badge>
                    </td>
                  </tr>
                ))}
              </DataTable>
            ) : (
              <EmptyState
                title="No paid orders in this period"
                description="Once customers complete QR Ph payment, your sales and net profit breakdown will appear here."
              />
            )}
          </Card>

          <Card
            title="Top sold seafood"
            subtitle="Best-performing items across paid orders"
          >
            {loading ? (
              <p className="loading-text">Loading items…</p>
            ) : topProducts.length ? (
              <DataTable headers={["Seafood", "Sold qty", "Line sales"]}>
                {topProducts.map((item) => (
                  <tr key={`${item.product_name}-${item.unit}`}>
                    <td>
                      <strong>{item.product_name}</strong>
                      <small>
                        {item.orders_count}{" "}
                        {item.orders_count === 1 ? "order" : "orders"}
                      </small>
                    </td>
                    <td>
                      {item.quantity} {item.unit}
                    </td>
                    <td className="money">{money(item.sales_centavos)}</td>
                  </tr>
                ))}
              </DataTable>
            ) : (
              <EmptyState
                title="No items sold yet"
                description="Sold seafood items will be ranked here automatically."
              />
            )}
          </Card>
        </div>
      )}
    </>
  );
}

"use client";

import Link from "next/link";
import { money } from "@/lib/data";
import { orderListPath, type ApiOrderPage } from "@/lib/orders";
import { quotationListPath, type ApiQuotationPage } from "@/lib/quotations";
import { salesReportPath, type ApiSalesReport } from "@/lib/reports";
import { rfqListPath, type ApiRfqPage } from "@/lib/rfqs";
import { useAuth } from "./auth-provider";
import {
  Badge,
  ButtonLink,
  Card,
  DataTable,
  EmptyState,
  PageHeader,
} from "./ui";
import { Icon } from "./ui/icon";
import { useApiResource } from "./use-api-resource";

export function Dashboard() {
  const { user } = useAuth();
  const firstName = user?.name?.trim().split(/\s+/)[0] || "Admin";
  const todayLabel = new Date()
    .toLocaleDateString("en-PH", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
    .toUpperCase();

  const recentRfqs = useApiResource<ApiRfqPage>(rfqListPath({ per_page: 5 }));
  const newRfqs = useApiResource<ApiRfqPage>(
    rfqListPath({ status: "New", per_page: 3 }),
  );
  const sentQuotes = useApiResource<ApiQuotationPage>(
    quotationListPath({ status: "Sent", per_page: 3 }),
  );
  const processingOrders = useApiResource<ApiOrderPage>(
    orderListPath({ status: "Processing", per_page: 3 }),
  );
  const salesReport = useApiResource<ApiSalesReport>(salesReportPath());

  const totalRfqs = recentRfqs.data?.meta.total ?? 0;
  const newRfqCount = newRfqs.data?.meta.total ?? 0;
  const sentQuoteCount = sentQuotes.data?.meta.total ?? 0;
  const processingOrderCount = processingOrders.data?.meta.total ?? 0;
  const salesSummary = salesReport.data?.data.summary;

  const firstNewRfq = newRfqs.data?.data[0];
  const latestRows = recentRfqs.data?.data ?? [];
  const attentionRfqs = newRfqs.data?.data ?? [];
  const attentionOrders = processingOrders.data?.data ?? [];
  const attentionQuotes = sentQuotes.data?.data ?? [];

  return (
    <>
      <PageHeader
        eyebrow={todayLabel}
        title={`Welcome back, ${firstName}.`}
        description="Live overview of your quote requests, active orders, gross sales, and net profit."
        actions={
          <>
            <ButtonLink href="/reports" variant="secondary">
              <Icon name="trend" size={16} />
              Sales reports
            </ButtonLink>
            <ButtonLink href="/rfqs">
              <Icon name="inbox" size={17} />
              View quote requests
              <Icon name="arrow" size={16} />
            </ButtonLink>
          </>
        }
      />
      <div className="welcome-banner">
        <div className="banner-icon">
          <Icon name="sun" size={25} />
        </div>
        <p>
          <strong>A good day for a good catch.</strong>
          <span>
            {newRfqCount > 0
              ? `You have ${newRfqCount} new quote ${newRfqCount === 1 ? "request" : "requests"} ready for sourcing.`
              : processingOrderCount > 0
                ? `${processingOrderCount} paid ${processingOrderCount === 1 ? "order is" : "orders are"} ready for island sourcing and packing.`
                : sentQuoteCount > 0
                  ? `${sentQuoteCount} sent ${sentQuoteCount === 1 ? "quotation is" : "quotations are"} awaiting customer confirmation.`
                  : "Your workspace is up to date. New guest requests and payments appear here automatically."}
          </span>
        </p>
        <Link href={firstNewRfq ? `/rfqs/${firstNewRfq.id}` : "/reports"}>
          {firstNewRfq ? "Review request" : "View sales"}
          <Icon name="arrow" size={17} />
        </Link>
      </div>

      <div className="stat-grid">
        {[
          {
            label: "Gross sales",
            value: salesReport.loading
              ? "—"
              : money(salesSummary?.gross_sales_centavos ?? 0),
            icon: "wallet",
            note: `${salesSummary?.paid_orders_count ?? 0} paid ${(salesSummary?.paid_orders_count ?? 0) === 1 ? "order" : "orders"}`,
            detail: "Total QR Ph collected",
            color: "blue",
          },
          {
            label: "Net profit (markup)",
            value: salesReport.loading
              ? "—"
              : money(salesSummary?.net_profit_centavos ?? 0),
            icon: "trend",
            note: "Markup / interest earned",
            detail: `Handling ${money(salesSummary?.handling_centavos ?? 0)} · Delivery ${money(salesSummary?.delivery_centavos ?? 0)}`,
            color: "mint",
          },
          {
            label: "Quote requests",
            value: recentRfqs.loading
              ? "—"
              : String(totalRfqs).padStart(2, "0"),
            icon: "inbox",
            note: newRfqs.loading
              ? "Checking inbox…"
              : `${newRfqCount} new · ${sentQuoteCount} sent quotes`,
            detail: "Submitted from storefront",
            color: "sand",
          },
          {
            label: "Paid orders to source",
            value: processingOrders.loading
              ? "—"
              : String(processingOrderCount).padStart(2, "0"),
            icon: "bag",
            note: "Full QR Ph payment verified",
            detail: `${salesSummary?.completed_orders_count ?? 0} completed all-time`,
            color: "peach",
          },
        ].map((s) => (
          <div className="stat-card" key={s.label}>
            <div className="stat-top">
              <span>{s.label}</span>
              <div className={`stat-icon ${s.color}`}>
                <Icon name={s.icon} size={19} />
              </div>
            </div>
            <strong className="stat-value" style={{ fontSize: 26 }}>
              {s.value}
            </strong>
            <div className="stat-note">
              <Icon name="trend" size={14} />
              {s.note}
            </div>
            <small>{s.detail}</small>
          </div>
        ))}
      </div>

      <div className="summary-strip">
        <span>
          <strong>
            {salesReport.loading
              ? "—"
              : money(salesSummary?.seafood_cost_centavos ?? 0)}
          </strong>
          Supplier seafood capital
        </span>
        <span>
          <strong>
            {salesReport.loading
              ? "—"
              : money(salesSummary?.handling_centavos ?? 0)}
          </strong>
          Handling & packing
        </span>
        <span>
          <strong>
            {salesReport.loading
              ? "—"
              : money(salesSummary?.delivery_centavos ?? 0)}
          </strong>
          Delivery collected
        </span>
        <span>
          <Link className="text-link" href="/reports">
            Open full sales report
            <Icon name="arrow" size={15} />
          </Link>
        </span>
      </div>

      <div className="dashboard-middle">
        <Card
          title="Fresh in your inbox"
          subtitle="Latest guest quote requests"
          action={
            <Link className="text-link" href="/rfqs">
              View all requests
              <Icon name="arrow" size={15} />
            </Link>
          }
        >
          {recentRfqs.loading ? (
            <p className="loading-text">Loading recent quote requests…</p>
          ) : latestRows.length ? (
            <DataTable
              headers={[
                "Request / customer",
                "Requested seafood",
                "Delivery to",
                "Status",
                "",
              ]}
            >
              {latestRows.map((rfq) => (
                <tr key={rfq.id}>
                  <td>
                    <Link className="table-primary" href={`/rfqs/${rfq.id}`}>
                      {rfq.customer_name}
                    </Link>
                    <small>{rfq.reference}</small>
                  </td>
                  <td>
                    {rfq.items.map((item) => item.name).join(", ")}
                    <small>
                      {rfq.items.length}{" "}
                      {rfq.items.length === 1 ? "item" : "items"}
                    </small>
                  </td>
                  <td>{rfq.location}</td>
                  <td>
                    <Badge>{rfq.status}</Badge>
                  </td>
                  <td>
                    <Link
                      className="row-action"
                      href={`/rfqs/${rfq.id}`}
                      aria-label={`Review ${rfq.reference}`}
                    >
                      <Icon name="arrow" size={18} />
                    </Link>
                  </td>
                </tr>
              ))}
            </DataTable>
          ) : (
            <EmptyState
              title="No quote requests yet"
              description="Requests from your storefront will show up here automatically."
            />
          )}
        </Card>
        <Card
          title="Your attention, please"
          subtitle="Pending requests, paid orders, and sent quotations"
          className="attention-card"
        >
          {attentionRfqs.map((rfq) => (
            <Link
              key={`rfq-${rfq.id}`}
              href={`/rfqs/${rfq.id}`}
              className="attention-item"
            >
              <span className="attention-icon mint">
                <Icon name="inbox" />
              </span>
              <span>
                <strong>New request · {rfq.reference}</strong>
                <small>
                  {rfq.customer_name} requested {rfq.items.length}{" "}
                  {rfq.items.length === 1 ? "item" : "items"}.
                </small>
              </span>
              <Icon name="chevron" size={16} />
            </Link>
          ))}
          {attentionOrders.map((order) => (
            <Link
              key={`order-${order.id}`}
              href={`/orders/${order.id}`}
              className="attention-item"
            >
              <span className="attention-icon peach">
                <Icon name="bag" />
              </span>
              <span>
                <strong>Paid order · {order.reference}</strong>
                <small>
                  {order.customer_name} · {money(order.paid_centavos)} ready to
                  source
                </small>
              </span>
              <Icon name="chevron" size={16} />
            </Link>
          ))}
          {attentionQuotes.map((quote) => (
            <Link
              key={`quote-${quote.id}`}
              href={`/quotations/${quote.id}`}
              className="attention-item"
            >
              <span className="attention-icon sand">
                <Icon name="clock" />
              </span>
              <span>
                <strong>
                  Sent quotation · {quote.reference}
                  {quote.version > 1 ? ` v${quote.version}` : ""}
                </strong>
                <small>
                  {quote.rfq?.customer_name ?? "Customer"} ·{" "}
                  {money(quote.total_centavos)}
                </small>
              </span>
              <Icon name="chevron" size={16} />
            </Link>
          ))}
          {!attentionRfqs.length &&
            !attentionOrders.length &&
            !attentionQuotes.length && (
              <p className="muted">
                No pending requests, orders, or sent quotations right now.
              </p>
            )}
          <div className="attention-foot">
            <Icon name="leaf" size={16} />
            Sourced on request. Quoted with care.
          </div>
        </Card>
      </div>
    </>
  );
}

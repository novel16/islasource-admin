"use client";

import Link from "next/link";
import { money } from "@/lib/data";
import { productListPath, type ProductPage } from "@/lib/products";
import { quotationListPath, type ApiQuotationPage } from "@/lib/quotations";
import { rfqListPath, type ApiRfqPage } from "@/lib/rfqs";
import { useAuth } from "./auth-provider";
import { Badge, ButtonLink, Card, DataTable, EmptyState, PageHeader } from "./ui";
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
  const acceptedQuotes = useApiResource<ApiQuotationPage>(
    quotationListPath({ status: "Accepted", per_page: 1 }),
  );
  const publishedProducts = useApiResource<ProductPage>(
    productListPath({ status: "Published", per_page: 1 }),
  );

  const totalRfqs = recentRfqs.data?.meta.total ?? 0;
  const newRfqCount = newRfqs.data?.meta.total ?? 0;
  const sentQuoteCount = sentQuotes.data?.meta.total ?? 0;
  const acceptedQuoteCount = acceptedQuotes.data?.meta.total ?? 0;
  const publishedProductCount = publishedProducts.data?.meta.total ?? 0;

  const firstNewRfq = newRfqs.data?.data[0];
  const latestRows = recentRfqs.data?.data ?? [];
  const attentionRfqs = newRfqs.data?.data ?? [];
  const attentionQuotes = sentQuotes.data?.data ?? [];

  return (
    <>
      <PageHeader
        eyebrow={todayLabel}
        title={`Welcome back, ${firstName}.`}
        description="Here’s what’s happening across your quote requests, quotations, and catalog."
        actions={
          <ButtonLink href="/rfqs">
            <Icon name="inbox" size={17} />
            View quote requests
            <Icon name="arrow" size={16} />
          </ButtonLink>
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
              : sentQuoteCount > 0
                ? `${sentQuoteCount} sent ${sentQuoteCount === 1 ? "quotation is" : "quotations are"} awaiting customer confirmation.`
                : "Your quote inbox is up to date. New guest requests will appear here automatically."}
          </span>
        </p>
        <Link href={firstNewRfq ? `/rfqs/${firstNewRfq.id}` : "/rfqs"}>
          {firstNewRfq ? "Review request" : "Open inbox"}
          <Icon name="arrow" size={17} />
        </Link>
      </div>
      <div className="stat-grid">
        {[
          {
            label: "Quote requests",
            value: recentRfqs.loading ? "—" : String(totalRfqs).padStart(2, "0"),
            icon: "inbox",
            note: newRfqs.loading
              ? "Checking inbox…"
              : `${newRfqCount} new ${newRfqCount === 1 ? "request" : "requests"}`,
            detail: "Submitted from storefront",
            color: "mint",
          },
          {
            label: "Sent quotations",
            value: sentQuotes.loading
              ? "—"
              : String(sentQuoteCount).padStart(2, "0"),
            icon: "file",
            note: "Awaiting customer decision",
            detail: "Valid for 2 days by default",
            color: "sand",
          },
          {
            label: "Accepted quotes",
            value: acceptedQuotes.loading
              ? "—"
              : String(acceptedQuoteCount).padStart(2, "0"),
            icon: "check",
            note: "Confirmed by customers",
            detail: "Ready for deposit follow-up",
            color: "blue",
          },
          {
            label: "Published seafood",
            value: publishedProducts.loading
              ? "—"
              : String(publishedProductCount).padStart(2, "0"),
            icon: "box",
            note: "Visible in public catalog",
            detail: "Sourced on request",
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
            <strong className="stat-value">{s.value}</strong>
            <div className="stat-note">
              <Icon name="trend" size={14} />
              {s.note}
            </div>
            <small>{s.detail}</small>
          </div>
        ))}
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
          subtitle="Pending requests and sent quotations"
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
          {!attentionRfqs.length && !attentionQuotes.length && (
            <p className="muted">
              No pending requests or sent quotations right now.
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

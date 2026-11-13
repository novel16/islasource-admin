"use client";
import Link from "next/link";
import { useDemo } from "./demo-provider";
import { Badge, ButtonLink, Card, DataTable, PageHeader } from "./ui";
import { Icon } from "./ui/icon";
import { money } from "@/lib/data";
export function Dashboard() {
  const { data } = useDemo();
  const revenue = data.orders.reduce((sum, o) => sum + o.paid, 0);
  return (
    <>
      <PageHeader
        eyebrow="FRIDAY, NOVEMBER 13, 2026"
        title="A fresh start, Alex."
        description="Here’s what’s happening with your island business today."
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
            You have {data.rfqs.filter((r) => r.status === "New").length} new
            request ready for your attention. Let’s turn it into something
            great.
          </span>
        </p>
        <Link href="/rfqs/RFQ-2026-001">
          Review request
          <Icon name="arrow" size={17} />
        </Link>
      </div>
      <div className="stat-grid">
        {[
          {
            label: "Quote requests",
            value: String(data.rfqs.length).padStart(2, "0"),
            icon: "inbox",
            note: "1 new request today",
            detail: "Ready for your attention",
            color: "mint",
          },
          {
            label: "Open quotations",
            value: String(
              data.quotes.filter((q) => q.status !== "Accepted").length,
            ).padStart(2, "0"),
            icon: "file",
            note: "1 awaiting customer",
            detail: "Keep the conversation going",
            color: "sand",
          },
          {
            label: "Active orders",
            value: String(
              data.orders.filter((o) => o.status !== "Completed").length,
            ).padStart(2, "0"),
            icon: "bag",
            note: "1 ready to pack",
            detail: "A little care in every order",
            color: "blue",
          },
          {
            label: "Payments received",
            value: money(revenue),
            icon: "wallet",
            note: "Across 3 sample orders",
            detail: "Demo payments · November",
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
          title="A growing island business"
          subtitle="Quotation activity · sample data"
          action={
            <span className="chart-period">
              Last 7 days
              <Icon name="down" size={13} />
            </span>
          }
        >
          <div className="chart-key">
            <span>
              <i />
              Requests
            </span>
            <span>
              <i />
              Quotations
            </span>
          </div>
          <div className="chart">
            <div className="chart-axis">
              <span>12</span>
              <span>8</span>
              <span>4</span>
              <span>0</span>
            </div>
            <div className="chart-plot">
              <div className="chart-grid-lines">
                <i />
                <i />
                <i />
                <i />
              </div>
              <svg
                viewBox="0 0 700 145"
                preserveAspectRatio="none"
                aria-label="Sample request activity rising from four to ten requests over seven days"
                role="img"
              >
                <defs>
                  <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#b9d3c4" stopOpacity=".5" />
                    <stop offset="100%" stopColor="#b9d3c4" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 113 C60 113 60 76 116 76 S175 98 233 98 291 47 350 47 408 73 466 73 524 37 583 37 641 15 700 15 V145 H0Z"
                  fill="url(#area)"
                />
                <path
                  d="M0 113 C60 113 60 76 116 76 S175 98 233 98 291 47 350 47 408 73 466 73 524 37 583 37 641 15 700 15"
                  stroke="#467c66"
                  strokeWidth="2.5"
                  fill="none"
                />
                <path
                  d="M0 132 C60 132 60 113 116 113 S175 120 233 120 291 98 350 98 408 109 466 109 524 77 583 77 641 70 700 70"
                  stroke="#dda485"
                  strokeWidth="2"
                  strokeDasharray="5 5"
                  fill="none"
                />
              </svg>
              <div className="chart-labels">
                {[
                  "Sat, 7",
                  "Sun, 8",
                  "Mon, 9",
                  "Tue, 10",
                  "Wed, 11",
                  "Thu, 12",
                  "Fri, 13",
                ].map((x) => (
                  <span key={x}>{x}</span>
                ))}
              </div>
            </div>
          </div>
        </Card>
        <Card
          title="Your attention, please"
          subtitle="A small list. A big difference."
          className="attention-card"
        >
          <Link href="/rfqs/RFQ-2026-001" className="attention-item">
            <span className="attention-icon mint">
              <Icon name="inbox" />
            </span>
            <span>
              <strong>A new quote request</strong>
              <small>Maia is looking for dried squid.</small>
            </span>
            <Icon name="chevron" size={16} />
          </Link>
          <Link href="/quotations/QT-2026-002" className="attention-item">
            <span className="attention-icon sand">
              <Icon name="clock" />
            </span>
            <span>
              <strong>A quotation to follow up</strong>
              <small>Anton’s quote is awaiting a response.</small>
            </span>
            <Icon name="chevron" size={16} />
          </Link>
          <Link href="/orders/ORD-2026-001" className="attention-item">
            <span className="attention-icon peach">
              <Icon name="bag" />
            </span>
            <span>
              <strong>Ready for the next step</strong>
              <small>Sofia’s order needs packing.</small>
            </span>
            <Icon name="chevron" size={16} />
          </Link>
          <div className="attention-foot">
            <Icon name="leaf" size={16} />
            Little details. Lasting relationships.
          </div>
        </Card>
      </div>
      <Card
        title="Fresh in your inbox"
        subtitle="The latest requests from your customers"
        action={
          <Link className="text-link" href="/rfqs">
            View all requests
            <Icon name="arrow" size={15} />
          </Link>
        }
      >
        <DataTable
          headers={[
            "Request / customer",
            "Products",
            "Delivery to",
            "Status",
            "",
          ]}
        >
          {data.rfqs.slice(0, 4).map((r) => (
            <tr key={r.id}>
              <td>
                <Link className="table-primary" href={`/rfqs/${r.id}`}>
                  {r.customer}
                </Link>
                <small>
                  {r.id} · {r.date}
                </small>
              </td>
              <td>
                {data.products.find((p) => p.id === r.productId)?.name}
                <small>{r.quantity} kg requested</small>
              </td>
              <td>{r.location}</td>
              <td>
                <Badge>{r.status}</Badge>
              </td>
              <td>
                <Link
                  className="row-action"
                  href={`/rfqs/${r.id}`}
                  aria-label={`Review ${r.id}`}
                >
                  <Icon name="arrow" size={18} />
                </Link>
              </td>
            </tr>
          ))}
        </DataTable>
      </Card>
    </>
  );
}

"use client";
import Link from "next/link";
import { useState } from "react";
import { useDemo } from "./demo-provider";
import {
  BackLink,
  Badge,
  Button,
  ButtonLink,
  Card,
  DataTable,
  Dialog,
  EmptyState,
  Field,
  PageHeader,
  SearchFilter,
} from "./ui";
import { Icon } from "./ui/icon";
import { money, shortDate } from "@/lib/data";
const paymentStatus = (paid: number, total: number) =>
  paid >= total ? "Paid" : paid > 0 ? "Deposit paid" : "Awaiting payment";
export function OrderList() {
  const { data } = useDemo();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const rows = data.orders.filter(
    (o) =>
      (status === "All" || o.status === status) &&
      `${o.id} ${o.customer} ${o.product}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        eyebrow="EVERY ORDER, WITH CARE"
        title="Orders"
        description="From confirmed catch to a happy doorstep."
        actions={
          <ButtonLink variant="secondary" href="/quotations">
            View quotations
            <Icon name="arrow" size={16} />
          </ButtonLink>
        }
      />
      <div className="summary-strip">
        {["Processing", "Packed", "Dispatched", "Completed"].map((s) => (
          <span key={s}>
            <strong>{data.orders.filter((o) => o.status === s).length}</strong>
            {s}
          </span>
        ))}
      </div>
      <Card>
        <SearchFilter
          query={query}
          setQuery={setQuery}
          status={status}
          setStatus={setStatus}
          statuses={["Processing", "Packed", "Dispatched", "Completed"]}
          placeholder="Search order, customer, or product…"
        />
        {rows.length ? (
          <DataTable
            headers={[
              "Order",
              "Customer / product",
              "Delivery",
              "Order total",
              "Payment",
              "Status",
              "",
            ]}
          >
            {rows.map((o) => (
              <tr key={o.id}>
                <td>
                  <Link className="table-primary" href={`/orders/${o.id}`}>
                    {o.id}
                  </Link>
                  <small>{o.quoteId}</small>
                </td>
                <td>
                  <strong>{o.customer}</strong>
                  <small>
                    {o.quantity} kg · {o.product}
                  </small>
                </td>
                <td>
                  {shortDate(o.deliveryDate)}
                  <small>{o.location}</small>
                </td>
                <td className="money">{money(o.total)}</td>
                <td>
                  <Badge>{paymentStatus(o.paid, o.total)}</Badge>
                </td>
                <td>
                  <Badge>{o.status}</Badge>
                </td>
                <td>
                  <Link
                    className="row-action"
                    href={`/orders/${o.id}`}
                    aria-label={`View ${o.id}`}
                  >
                    <Icon name="arrow" size={17} />
                  </Link>
                </td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <EmptyState />
        )}
        <div className="table-footer">
          {rows.length} sample orders<span>Demo payments only</span>
        </div>
      </Card>
    </>
  );
}
export function OrderDetail({ id }: { id: string }) {
  const { data, update, notify } = useDemo();
  const [showPayment, setShowPayment] = useState(false);
  const [amount, setAmount] = useState("");
  const o = data.orders.find((x) => x.id === id);
  if (!o)
    return (
      <>
        <PageHeader title="Order not found" />
        <ButtonLink href="/orders">All orders</ButtonLink>
      </>
    );
  const next = (
    {
      Processing: "Packed",
      Packed: "Dispatched",
      Dispatched: "Completed",
    } as Record<string, string>
  )[o.status];
  const nextLabel = (
    {
      Packed: "Mark as packed",
      Dispatched: "Mark as dispatched",
      Completed: "Mark as completed",
    } as Record<string, string>
  )[next || ""];
  const outstanding = o.total - o.paid;
  function advance() {
    if (!o || !next) return;
    if (next === "Dispatched" && outstanding > 0) {
      notify("Record the remaining demo balance before dispatching this order.");
      return;
    }
    update((d) => ({
      ...d,
      orders: d.orders.map((x) =>
        x.id === id
          ? {
              ...x,
              status: next,
              timeline: [...x.timeline, `${next} · demo update`],
            }
          : x,
      ),
    }));
    notify(`Demo order marked as ${next.toLowerCase()}.`);
  }
  return (
    <>
      <BackLink href="/orders">All orders</BackLink>
      <PageHeader
        eyebrow="ORDER DETAILS"
        title={o.id}
        description={`${o.customer} · ${o.quoteId}`}
        actions={
          <>
            <Badge>{o.status}</Badge>
            {next && (
              <Button onClick={advance}>
                <Icon name={next === "Completed" ? "check" : "box"} size={17} />
                {nextLabel}
              </Button>
            )}
          </>
        }
      />
      <div className="order-progress">
        {["Processing", "Packed", "Dispatched", "Completed"].map((s, i) => {
          const current = [
            "Processing",
            "Packed",
            "Dispatched",
            "Completed",
          ].indexOf(o.status);
          return (
            <div key={s} className={i <= current ? "done" : ""}>
              <span>
                {i < current ? <Icon name="check" size={16} /> : i + 1}
              </span>
              <strong>{s}</strong>
            </div>
          );
        })}
      </div>
      <div className="detail-grid">
        <div className="detail-main">
          <Card
            title="The order"
            subtitle="A little island goodness, on its way"
          >
            <div className="order-item">
              <div className="stat-icon mint">
                <Icon name="box" size={24} />
              </div>
              <div>
                <strong>{o.product}</strong>
                <p>{o.quantity} kg · Grade and packing as quoted</p>
              </div>
              <span>{money(o.total)}</span>
            </div>
            <div className="order-delivery">
              <div>
                <span className="eyebrow">DELIVER TO</span>
                <strong>{o.customer}</strong>
                <p>{o.location}</p>
              </div>
              <div>
                <span className="eyebrow">REQUESTED DELIVERY</span>
                <strong>{shortDate(o.deliveryDate)}</strong>
                <p>Schedule confirmed before dispatch</p>
              </div>
            </div>
          </Card>
          <Card title="Order timeline" subtitle="Every step, in one place">
            <ol className="timeline">
              {o.timeline.map((item, i) => (
                <li key={i}>
                  <span>
                    <Icon name="check" size={13} />
                  </span>
                  <div>
                    <strong>{item.split(" · ")[0]}</strong>
                    <p>
                      {item.split(" · ").slice(1).join(" · ") ||
                        "Sample activity"}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
        <aside className="detail-aside">
          <Card
            title="Payment summary"
            action={<Badge>{paymentStatus(o.paid, o.total)}</Badge>}
          >
            <div className="payment-amount">
              <span>Order total</span>
              <strong>{money(o.total)}</strong>
            </div>
            <dl className="price-breakdown">
              <div>
                <dt>Demo payments recorded</dt>
                <dd>{money(o.paid)}</dd>
              </div>
              <div className="price-divider">
                <dt>Outstanding balance</dt>
                <dd>{money(outstanding)}</dd>
              </div>
            </dl>
            {outstanding > 0 ? (
              <Button
                className="full-width"
                variant="secondary"
                onClick={() => {
                  setAmount(String(outstanding / 100));
                  setShowPayment(true);
                }}
              >
                <Icon name="plus" size={16} />
                Record demo payment
              </Button>
            ) : (
              <div className="payment-complete">
                <Icon name="check" size={18} />
                Fully paid · sample record
              </div>
            )}
            <div className="soft-note">
              All payments are simulated. No PayMongo connection, QR code, or
              live funds are involved.
            </div>
          </Card>
          <div className="aside-tip">
            <Icon name="leaf" size={24} />
            <h3>Packed with purpose.</h3>
            <p>
              Check the quoted grade, weight, and delivery details before
              dispatching each order.
            </p>
          </div>
        </aside>
      </div>
      {showPayment && (
        <Dialog
          title="Record a demo payment"
          onClose={() => setShowPayment(false)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const cents = Math.round(Number(amount) * 100);
              if (
                !Number.isSafeInteger(cents) ||
                cents <= 0 ||
                cents > outstanding
              ) {
                notify(
                  "Enter a positive amount no greater than the outstanding balance.",
                );
                return;
              }
              update((d) => ({
                ...d,
                orders: d.orders.map((x) =>
                  x.id === id
                    ? {
                        ...x,
                        paid: x.paid + cents,
                        timeline: [
                          ...x.timeline,
                          `Demo payment recorded · ${money(cents)}`,
                        ],
                      }
                    : x,
                ),
              }));
              setShowPayment(false);
              notify("Sample payment recorded. No real funds were received.");
            }}
          >
            <div className="dialog-body">
              <p>
                Outstanding balance: <strong>{money(outstanding)}</strong>
              </p>
              <Field label="Demo amount (₱)">
                <input
                  aria-label="Demo amount (₱)"
                  type="number"
                  min="0.01"
                  max={outstanding / 100}
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </Field>
              <div className="soft-note">
                Prototype ledger entry only. Production payments will be
                confirmed by verified API webhooks.
              </div>
            </div>
            <div className="dialog-footer">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowPayment(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Record demo payment</Button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}

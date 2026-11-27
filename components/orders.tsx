"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { ApiError, apiEndpoints } from "@/lib/api";
import { money, shortDate } from "@/lib/data";
import {
  createOrdersClient,
  nextOrderStatus,
  orderListPath,
  orderStatuses,
  type ApiOrder,
  type ApiOrderMessage,
  type ApiOrderPage,
} from "@/lib/orders";
import { useAuth } from "./auth-provider";
import { useWorkspace } from "./workspace-provider";
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
import { useApiResource } from "./use-api-resource";

const fulfillmentSteps = ["Processing", "Packed", "Dispatched", "Completed"] as const;

function formatDateTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatQty(value: string | number): string {
  const num = Number(value);
  return Number.isFinite(num) ? num.toString() : String(value);
}

export function OrderList() {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const path = orderListPath({ per_page: 15, search, status, page });
  const { data, error, loading, retry } = useApiResource<ApiOrderPage>(path);
  const rows = data?.data ?? [];

  return (
    <>
      <PageHeader
        eyebrow="FULFILLMENT & QR PH PAYMENTS"
        title="Orders"
        description="Orders created automatically when customers accept quotations. Begin sourcing once full QR Ph payment is verified."
        actions={
          <ButtonLink variant="secondary" href="/quotations">
            View quotations
            <Icon name="arrow" size={16} />
          </ButtonLink>
        }
      />
      <Card>
        <SearchFilter
          query={query}
          setQuery={setQuery}
          status={status}
          setStatus={(value) => {
            setStatus(value);
            setPage(1);
          }}
          statuses={[...orderStatuses]}
          placeholder="Search order, quotation, customer, or email…"
        />
        {loading ? (
          <p className="loading-text">Loading orders…</p>
        ) : error ? (
          <div className="empty-state">
            <Icon name="bag" size={30} />
            <h3>Couldn’t load orders</h3>
            <p>{error.message}</p>
            <Button variant="secondary" onClick={retry}>
              Try again
            </Button>
          </div>
        ) : rows.length ? (
          <DataTable
            headers={[
              "Order",
              "Customer",
              "Delivery",
              "Total (Full)",
              "Payment",
              "Status",
              "",
            ]}
          >
            {rows.map((order) => (
              <tr key={order.id}>
                <td>
                  <Link className="table-primary" href={`/orders/${order.id}`}>
                    {order.reference}
                  </Link>
                  <small>{order.quotation_reference ?? `Quote #${order.quotation_id}`}</small>
                </td>
                <td>
                  <strong>{order.customer_name}</strong>
                  <small>
                    {order.items?.length ?? 0}{" "}
                    {(order.items?.length ?? 0) === 1 ? "item" : "items"} ·{" "}
                    {order.email}
                  </small>
                </td>
                <td>
                  {order.location}
                  <small>
                    {order.confirmed_delivery_date
                      ? shortDate(order.confirmed_delivery_date)
                      : order.requested_delivery_date
                        ? shortDate(order.requested_delivery_date)
                        : "Date flexible"}
                  </small>
                </td>
                <td className="money">{money(order.total_centavos)}</td>
                <td>
                  <Badge>{order.payment_status}</Badge>
                </td>
                <td>
                  <Badge>{order.status}</Badge>
                </td>
                <td>
                  <Link className="text-link" href={`/orders/${order.id}`}>
                    Manage
                    <Icon name="arrow" size={15} />
                  </Link>
                </td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <EmptyState
            title={
              query || status !== "All"
                ? "No matching orders"
                : "No orders yet"
            }
            description={
              query || status !== "All"
                ? "Try another search or status filter."
                : "Orders appear automatically as soon as a customer accepts a quotation."
            }
          />
        )}
        <div className="table-footer">
          <span>
            Showing {data?.meta.from ?? 0}–{data?.meta.to ?? 0} of{" "}
            {data?.meta.total ?? 0} orders
          </span>
          <div className="pagination-controls">
            <Button
              variant="ghost"
              disabled={!data || page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>
            <span>
              Page {data?.meta.current_page ?? page} of{" "}
              {data?.meta.last_page ?? 1}
            </span>
            <Button
              variant="ghost"
              disabled={!data || page >= data.meta.last_page}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </div>
          <span>PayMongo QR Ph · Full payment</span>
        </div>
      </Card>
    </>
  );
}

export function OrderDetail({ id }: { id: string }) {
  if (/^\d+$/.test(id)) return <LiveOrderDetail id={Number(id)} />;
  return (
    <>
      <BackLink href="/orders">All orders</BackLink>
      <PageHeader
        title="Order not found"
        description="Select an order from your live orders list."
      />
      <ButtonLink href="/orders">All orders</ButtonLink>
    </>
  );
}

function LiveOrderDetail({ id }: { id: number }) {
  const { request } = useAuth();
  const { notify } = useWorkspace();
  const { data, error, loading, retry } = useApiResource<{ data: ApiOrder }>(
    apiEndpoints.order(id),
  );
  const [savedOrder, setSavedOrder] = useState<ApiOrder | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [messageSaving, setMessageSaving] = useState(false);
  const [messageError, setMessageError] = useState("");

  const order = savedOrder?.id === id ? savedOrder : (data?.data ?? null);

  if (loading) {
    return (
      <>
        <BackLink href="/orders">All orders</BackLink>
        <p className="loading-text">Loading order…</p>
      </>
    );
  }

  if (error || !order) {
    return (
      <>
        <BackLink href="/orders">All orders</BackLink>
        <PageHeader
          title="Couldn’t open order"
          description={error?.message ?? "This order could not be found."}
          actions={
            <Button variant="secondary" onClick={retry}>
              Try again
            </Button>
          }
        />
      </>
    );
  }

  const next = nextOrderStatus(order);
  const nextLabel =
    next === "Packed"
      ? "Mark as packed"
      : next === "Dispatched"
        ? "Mark as dispatched"
        : next === "Completed"
          ? "Mark as completed"
          : "";
  const paidIndex = fulfillmentSteps.indexOf(
    order.status as (typeof fulfillmentSteps)[number],
  );
  const latestPaidPayment = order.payments?.find((p) => p.status === "Paid");

  async function advance() {
    if (!order || !next || busy) return;
    setBusy(true);
    setActionError("");
    try {
      const updated = await createOrdersClient(request).updateStatus(
        order.id,
        next,
      );
      setSavedOrder(updated);
      notify(`Order marked as ${updated.status.toLowerCase()}. Customer emailed.`);
    } catch (failure) {
      setActionError(
        failure instanceof ApiError
          ? Object.values(failure.errors).flat()[0] || failure.message
          : "We couldn’t update the order status. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function confirmCancel() {
    if (!order || busy) return;
    setBusy(true);
    setActionError("");
    try {
      const updated = await createOrdersClient(request).updateStatus(
        order.id,
        "Cancelled",
        cancelReason,
      );
      setSavedOrder(updated);
      setShowCancel(false);
      notify("Unpaid order cancelled.");
    } catch (failure) {
      setActionError(
        failure instanceof ApiError
          ? Object.values(failure.errors).flat()[0] || failure.message
          : "We couldn’t cancel this order. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function copyTrackingLink() {
    if (!order?.tracking_url) return;
    try {
      await navigator.clipboard.writeText(order.tracking_url);
      notify("Customer payment & order link copied.");
    } catch {
      notify("Copy failed — select and copy the link manually.");
    }
  }

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order || messageSaving) return;
    setMessageSaving(true);
    setMessageError("");
    try {
      const created: ApiOrderMessage = await createOrdersClient(
        request,
      ).sendMessage(order.id, messageBody);
      setSavedOrder({
        ...order,
        messages: [...(order.messages ?? []), created],
      });
      setMessageBody("");
      notify("Message posted and emailed to customer.");
    } catch (failure) {
      setMessageError(
        failure instanceof ApiError
          ? Object.values(failure.errors).flat()[0] || failure.message
          : "We couldn’t send this message. Please try again.",
      );
    } finally {
      setMessageSaving(false);
    }
  }

  const messages = order.messages ?? [];
  const messagingOpen =
    order.status !== "Completed" && order.status !== "Cancelled";

  return (
    <>
      <BackLink href="/orders">All orders</BackLink>
      <PageHeader
        eyebrow="LIVE ORDER"
        title={order.reference}
        description={`${order.customer_name} · From ${order.quotation_reference ?? `Quotation #${order.quotation_id}`}`}
        actions={
          <>
            <Badge>{order.payment_status}</Badge>
            <Badge>{order.status}</Badge>
            {next && (
              <Button disabled={busy} onClick={() => void advance()}>
                <Icon name={next === "Completed" ? "check" : "box"} size={17} />
                {busy ? "Updating…" : nextLabel}
              </Button>
            )}
            {order.status === "Awaiting Payment" &&
              order.payment_status === "Unpaid" && (
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => setShowCancel(true)}
                >
                  Cancel unpaid order
                </Button>
              )}
          </>
        }
      />
      {actionError && (
        <p className="form-error" role="alert">
          {actionError}
        </p>
      )}
      {paidIndex >= 0 && (
        <div className="order-progress">
          {fulfillmentSteps.map((step, index) => (
            <div key={step} className={index <= paidIndex ? "done" : ""}>
              <span>
                {index < paidIndex ? <Icon name="check" size={16} /> : index + 1}
              </span>
              <strong>{step}</strong>
            </div>
          ))}
        </div>
      )}
      <div className="detail-grid">
        <div className="detail-main">
          {order.tracking_url && (
            <Card
              title="Customer payment & tracking link"
              subtitle="Share this private link if the customer needs to pay via QR Ph or check progress"
            >
              <div className="share-card">
                <input
                  type="text"
                  readOnly
                  aria-label="Customer order link"
                  value={order.tracking_url}
                  onFocus={(event) => event.currentTarget.select()}
                />
                <Button variant="secondary" onClick={() => void copyTrackingLink()}>
                  Copy link
                </Button>
              </div>
            </Card>
          )}
          <Card
            title="Ordered seafood"
            subtitle="Confirmed items locked from the accepted quotation"
          >
            <DataTable headers={["Seafood & specifications", "Quantity", "Amount"]}>
              {(order.items ?? []).map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.product_name}</strong>
                    {item.specs && <small>{item.specs}</small>}
                  </td>
                  <td>
                    {formatQty(item.quantity)} {item.unit}
                  </td>
                  <td className="money">{money(item.line_selling_centavos)}</td>
                </tr>
              ))}
            </DataTable>
            <div className="order-delivery">
              <div>
                <span className="eyebrow">DELIVER TO</span>
                <strong>{order.customer_name}</strong>
                <p>{order.location}</p>
                <p>{order.phone} · {order.email}</p>
              </div>
              <div>
                <span className="eyebrow">
                  {order.confirmed_delivery_date
                    ? "CONFIRMED DELIVERY"
                    : "PREFERRED DELIVERY"}
                </span>
                <strong>
                  {order.confirmed_delivery_date
                    ? shortDate(order.confirmed_delivery_date)
                    : order.requested_delivery_date
                      ? shortDate(order.requested_delivery_date)
                      : "Flexible"}
                </strong>
                <p>
                  <Link
                    className="text-link"
                    href={`/quotations/${order.quotation_id}`}
                  >
                    Open quotation
                    <Icon name="arrow" size={14} />
                  </Link>
                </p>
              </div>
            </div>
          </Card>
          <div id="messages">
            <Card
              title="Customer messages"
              subtitle="Direct follow-ups on this order · Customer receives an email notification with reply link"
              action={
                <Badge>{messagingOpen ? "Active" : "Closed"}</Badge>
              }
            >
              {messages.length > 0 ? (
                <div className="message-thread">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`message-item ${msg.sender_type === "admin" ? "from-admin" : ""}`}
                    >
                      <div className="message-meta">
                        <strong>
                          {msg.sender_name}{" "}
                          <small>
                            ({msg.sender_type === "admin" ? "IslaSource" : "Customer"})
                          </small>
                        </strong>
                        <span>{formatDateTime(msg.created_at)}</span>
                      </div>
                      <p>{msg.body}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="notes-list">
                  <p className="muted">
                    No messages yet. Share packing photos/waybill details, ETA,
                    or answer customer questions here.
                  </p>
                </div>
              )}
              {messagingOpen ? (
                <form
                  className="note-form"
                  onSubmit={(event) => void submitMessage(event)}
                  aria-busy={messageSaving}
                >
                  <label className="sr-only" htmlFor="order-message-body">
                    Message to customer
                  </label>
                  <textarea
                    id="order-message-body"
                    placeholder="Send a delivery update, waybill number, or follow-up question to the customer…"
                    rows={3}
                    maxLength={2000}
                    required
                    disabled={messageSaving}
                    value={messageBody}
                    onChange={(event) => {
                      setMessageBody(event.target.value);
                      if (messageError) setMessageError("");
                    }}
                  />
                  {messageError && (
                    <p className="form-error" role="alert">
                      {messageError}
                    </p>
                  )}
                  <Button type="submit" disabled={messageSaving}>
                    <Icon name="mail" size={16} />
                    {messageSaving ? "Sending…" : "Send & email customer"}
                  </Button>
                </form>
              ) : (
                <div className="soft-note">
                  Messaging is closed because this order is{" "}
                  {order.status.toLowerCase()}.
                </div>
              )}
            </Card>
          </div>
          <Card title="Order timeline" subtitle="Verified milestones">
            <ol className="timeline">
              <li>
                <span><Icon name="check" size={13} /></span>
                <div>
                  <strong>Order created</strong>
                  <p>{formatDateTime(order.created_at)}</p>
                </div>
              </li>
              {order.paid_at && (
                <li>
                  <span><Icon name="check" size={13} /></span>
                  <div>
                    <strong>Full payment confirmed via PayMongo QR Ph</strong>
                    <p>{formatDateTime(order.paid_at)}</p>
                  </div>
                </li>
              )}
              {order.packed_at && (
                <li>
                  <span><Icon name="check" size={13} /></span>
                  <div>
                    <strong>Packed</strong>
                    <p>{formatDateTime(order.packed_at)}</p>
                  </div>
                </li>
              )}
              {order.dispatched_at && (
                <li>
                  <span><Icon name="check" size={13} /></span>
                  <div>
                    <strong>Dispatched</strong>
                    <p>{formatDateTime(order.dispatched_at)}</p>
                  </div>
                </li>
              )}
              {order.completed_at && (
                <li>
                  <span><Icon name="check" size={13} /></span>
                  <div>
                    <strong>Completed</strong>
                    <p>{formatDateTime(order.completed_at)}</p>
                  </div>
                </li>
              )}
              {order.cancelled_at && (
                <li>
                  <span><Icon name="close" size={13} /></span>
                  <div>
                    <strong>Cancelled</strong>
                    <p>
                      {formatDateTime(order.cancelled_at)}
                      {order.cancel_reason ? ` · ${order.cancel_reason}` : ""}
                    </p>
                  </div>
                </li>
              )}
            </ol>
          </Card>
        </div>
        <aside className="detail-aside">
          <Card
            title="Payment summary"
            action={<Badge>{order.payment_status}</Badge>}
          >
            <div className="payment-amount">
              <span>Full payment total</span>
              <strong>{money(order.total_centavos)}</strong>
            </div>
            <dl className="price-breakdown">
              <div>
                <dt>Seafood subtotal</dt>
                <dd>{money(order.subtotal_centavos)}</dd>
              </div>
              <div>
                <dt>Delivery</dt>
                <dd>
                  {order.delivery_centavos === 0
                    ? "Free"
                    : money(order.delivery_centavos)}
                </dd>
              </div>
              <div className="price-divider">
                <dt>Paid via QR Ph</dt>
                <dd>{money(order.paid_centavos)}</dd>
              </div>
            </dl>
            {order.payment_status === "Paid" ? (
              <div className="payment-complete">
                <Icon name="check" size={18} />
                Full payment verified via PayMongo QR Ph
                {latestPaidPayment?.paymongo_payment_id
                  ? ` (${latestPaidPayment.paymongo_payment_id})`
                  : ""}
              </div>
            ) : (
              <div className="soft-note">
                Waiting for customer full payment via PayMongo QR Ph. Do not
                source or dispatch until payment is verified.
              </div>
            )}
          </Card>
          <div className="aside-tip">
            <Icon name="leaf" size={24} />
            <h3>Full payment first.</h3>
            <p>
              Once PayMongo verifies the customer’s QR Ph payment, this order
              moves to Processing automatically and you receive an email alert.
            </p>
          </div>
        </aside>
      </div>
      {showCancel && (
        <Dialog
          title="Cancel this unpaid order?"
          onClose={() => !busy && setShowCancel(false)}
        >
          <div className="dialog-body">
            <p>
              Cancel <strong>{order.reference}</strong> so the customer can no
              longer pay through this order link.
            </p>
            <Field label="Reason (optional)">
              <input
                type="text"
                maxLength={500}
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                placeholder="e.g. Customer requested changes or did not pay"
              />
            </Field>
          </div>
          <div className="dialog-footer">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => setShowCancel(false)}
            >
              Keep order
            </Button>
            <Button disabled={busy} onClick={() => void confirmCancel()}>
              {busy ? "Cancelling…" : "Cancel order"}
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
}

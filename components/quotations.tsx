"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { calculateQuote, money, shortDate, type Quote } from "@/lib/data";
export function QuotationList() {
  const { data } = useDemo();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const rows = data.quotes.filter(
    (q) =>
      (status === "All" || q.status === status) &&
      `${q.id} ${data.rfqs.find((r) => r.id === q.rfqId)?.customer}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        eyebrow="THOUGHTFULLY PRICED"
        title="Quotations"
        description="Clear pricing. Considered details. One step closer to an order."
        actions={
          <ButtonLink href="/rfqs" variant="secondary">
            <Icon name="plus" size={17} />
            Create from a request
          </ButtonLink>
        }
      />
      <Card>
        <SearchFilter
          query={query}
          setQuery={setQuery}
          status={status}
          setStatus={setStatus}
          statuses={["Draft", "Sent", "Accepted"]}
          placeholder="Search quotation or customer…"
        />
        {rows.length ? (
          <DataTable
            headers={[
              "Quotation",
              "Customer",
              "Order value",
              "Deposit",
              "Status",
              "",
            ]}
          >
            {rows.map((q) => {
              const total = calculateQuote(q);
              return (
                <tr key={q.id}>
                  <td>
                    <Link
                      className="table-primary"
                      href={`/quotations/${q.id}`}
                    >
                      {q.id}
                    </Link>
                    <small>{q.rfqId}</small>
                  </td>
                  <td>
                    <strong>
                      {data.rfqs.find((r) => r.id === q.rfqId)?.customer}
                    </strong>
                    <small>
                      {q.quantity} kg ·{" "}
                      {
                        data.products.find(
                          (p) =>
                            p.id ===
                            data.rfqs.find((r) => r.id === q.rfqId)?.productId,
                        )?.name
                      }
                    </small>
                  </td>
                  <td className="money">{money(total.total)}</td>
                  <td>
                    {money(total.deposit)}
                    <small>{q.deposit}% to confirm</small>
                  </td>
                  <td>
                    <Badge>{q.status}</Badge>
                  </td>
                  <td>
                    <Link className="text-link" href={`/quotations/${q.id}`}>
                      {q.status === "Draft" ? "Continue" : "View"}
                      <Icon name="arrow" size={15} />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </DataTable>
        ) : (
          <EmptyState />
        )}
        <div className="table-footer">
          {rows.length} quotations<span>Prices shown in Philippine pesos</span>
        </div>
      </Card>
      <div className="inline-tip">
        <Icon name="leaf" size={18} />
        Your customer previews show selling prices and terms. Supplier costs and
        markup stay private.
      </div>
    </>
  );
}

export function QuotationDetail({ id }: { id: string }) {
  const { data } = useDemo();
  const q = data.quotes.find((q) => q.id === id);
  return q ? (
    <QuotationEditor key={id} initial={q} />
  ) : (
    <>
      <PageHeader title="Quotation not found" />
      <ButtonLink href="/quotations">All quotations</ButtonLink>
    </>
  );
}
function QuotationEditor({ initial }: { initial: Quote }) {
  const { data, update, notify } = useDemo();
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const [modal, setModal] = useState<"preview" | "send" | "accept" | null>(
    null,
  );
  const rfq = data.rfqs.find((r) => r.id === q.rfqId);
  const product = data.products.find((p) => p.id === rfq?.productId);
  const stored = data.quotes.find((x) => x.id === q.id) || q;
  const readOnly = stored.status !== "Draft";
  let total: ReturnType<typeof calculateQuote> | null = null;
  let error = "";
  try {
    total = calculateQuote(q);
  } catch (e) {
    error = e instanceof Error ? e.message : "Please check your pricing.";
  }
  function save(status = stored.status) {
    if (readOnly) {
      notify("Create a revision to change a sent or accepted quotation.");
      return;
    }
    if (error) {
      notify(error);
      return;
    }
    if (!q.terms.trim()) {
      notify("Add customer-facing terms before saving or sending.");
      return;
    }
    update((d) => ({
      ...d,
      quotes: d.quotes.map((x) => (x.id === q.id ? { ...q, status } : x)),
      rfqs: d.rfqs.map((x) =>
        x.id === q.rfqId ? { ...x, status: "Quoted" } : x,
      ),
    }));
    notify(
      status === "Sent"
        ? "Demo quotation marked as sent. No message was delivered."
        : "Quotation saved in this browser.",
    );
    setQ({ ...q, status });
  }
  function createRevision() {
    const existingDraft = data.quotes.find(
      (x) => x.rfqId === q.rfqId && x.status === "Draft",
    );
    if (existingDraft) {
      router.push(`/quotations/${existingDraft.id}`);
      notify("Opened the existing draft revision for this request.");
      return;
    }
    const selectedOffer = rfq?.offers.find(
      (o) => o.supplierId === rfq.selectedSupplier,
    );
    const id = `QT-2026-${String(Math.max(...data.quotes.map((x) => Number(x.id.split("-").at(-1)))) + 1).padStart(3, "0")}`;
    const revision = {
      ...stored,
      id,
      status: "Draft",
      unitCost: selectedOffer?.unitCost ?? stored.unitCost,
      validityDays: data.settings.validity,
    };
    update((d) => ({ ...d, quotes: [...d.quotes, revision] }));
    router.push(`/quotations/${id}`);
    notify(
      `Draft revision created from ${stored.id}. The original is unchanged.`,
    );
  }
  function accept() {
    if (!total || !rfq) return;
    const existing = data.orders.find((o) => o.quoteId === q.id);
    if (existing) {
      router.push(`/orders/${existing.id}`);
      return;
    }
    const orderId = `ORD-2026-${String(data.orders.length + 1).padStart(3, "0")}`;
    update((d) => ({
      ...d,
      quotes: d.quotes.map((x) =>
        x.id === q.id ? { ...q, status: "Accepted" } : x,
      ),
      orders: [
        {
          id: orderId,
          quoteId: q.id,
          customer: rfq.customer,
          product: product?.name || "Seafood",
          quantity: q.quantity,
          total: total!.total,
          paid: 0,
          status: "Processing",
          deliveryDate: rfq.deliveryDate,
          location: rfq.location,
          timeline: [
            "Demo customer acceptance recorded",
            "Order created · awaiting demo deposit",
          ],
        },
        ...d.orders,
      ],
    }));
    notify("Demo quotation accepted. A sample order has been created.");
    router.push(`/orders/${orderId}`);
  }
  function number(
    key: keyof Pick<
      Quote,
      "quantity" | "unitCost" | "handling" | "markup" | "delivery" | "deposit"
    >,
    label: string,
    centavos = false,
    max?: number,
  ) {
    return (
      <Field label={label}>
        <input
          aria-label={label}
          type="number"
          min={key === "quantity" ? 0.01 : 0}
          step={centavos ? 0.01 : key === "quantity" ? 0.01 : 1}
          max={max}
          required
          disabled={readOnly}
          value={centavos ? q[key] / 100 : q[key]}
          onChange={(e) =>
            setQ({
              ...q,
              [key]: centavos
                ? Math.round(Number(e.target.value) * 100)
                : Number(e.target.value),
            })
          }
        />
      </Field>
    );
  }
  return (
    <>
      <BackLink href="/quotations">All quotations</BackLink>
      <PageHeader
        eyebrow="QUOTATION BUILDER"
        title={q.id}
        description={`${rfq?.customer} · Based on ${q.rfqId}`}
        actions={
          <>
            <Badge>{stored.status}</Badge>
            <Button
              variant="secondary"
              onClick={() => setModal("preview")}
              disabled={!!error}
            >
              <Icon name="eye" size={17} />
              Customer preview
            </Button>
            {readOnly && (
              <Button variant="secondary" onClick={createRevision}>
                <Icon name="plus" size={16} />
                Create revision
              </Button>
            )}
            {!readOnly && (
              <Button onClick={() => setModal("send")} disabled={!!error}>
                <Icon name="mail" size={17} />
                Send quotation
              </Button>
            )}
          </>
        }
      />
      <div className="detail-grid quote-grid">
        <div className="detail-main">
          <Card
            title="Build a fair quotation"
            subtitle="Private pricing · all amounts in Philippine pesos"
            action={
              <span className="private-label">
                <Icon name="eye" size={14} />
                Admin only
              </span>
            }
          >
            <form
              id="quotation-form"
              onSubmit={(e) => {
                e.preventDefault();
                save();
              }}
            >
              <div className="quote-product">
                <span className="stat-icon mint">
                  <Icon name="box" />
                </span>
                <div>
                  <strong>{product?.name}</strong>
                  <small>
                    {rfq?.location} · {rfq && shortDate(rfq.deliveryDate)}
                  </small>
                </div>
              </div>
              <div className="form-grid">
                {number("quantity", "Quantity (kg)", false, 100000)}
                {number("unitCost", "Supplier cost per kg (₱)", true)}
                {number("handling", "Handling & packing (₱)", true)}
                {number("markup", "Markup on cost + handling (%)", false, 1000)}
                {number("delivery", "Delivery fee (₱)", true)}
                {number("deposit", "Required deposit (%)", false, 100)}
              </div>
              <div className="calculation-note">
                <Icon name="help" size={16} />
                <p>
                  Markup is calculated on supplier cost plus handling. Delivery
                  is added after markup. Values are rounded to the nearest
                  centavo.
                </p>
              </div>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <div className="form-section">
                <Field label="Customer-facing terms">
                  <textarea
                    aria-label="Customer-facing terms"
                    rows={3}
                    disabled={readOnly}
                    value={q.terms}
                    onChange={(e) => setQ({ ...q, terms: e.target.value })}
                    required
                  />
                </Field>
                <p className="muted small-text">
                  Quotation validity: {q.validityDays ?? 2} days from issue. New
                  quotations use the default in Settings.
                </p>
              </div>
              <div className="form-footer">
                <span>Saved locally in this demo workspace.</span>
                <Button
                  type="submit"
                  variant="secondary"
                  disabled={!!error || readOnly}
                >
                  <Icon name="check" size={16} />
                  Save quotation
                </Button>
              </div>
            </form>
          </Card>
          {stored.status === "Sent" && (
            <Card
              title="Try the next step"
              subtitle="Simulate the customer accepting this quotation"
            >
              <div className="acceptance-demo">
                <p>
                  This creates a sample order in your workspace. No customer
                  interaction or payment takes place.
                </p>
                <Button variant="secondary" onClick={() => setModal("accept")}>
                  Simulate customer acceptance
                  <Icon name="arrow" size={16} />
                </Button>
              </div>
            </Card>
          )}
          {stored.status === "Accepted" && (
            <div className="inline-tip">
              <Icon name="check" size={20} />
              This quotation has been accepted.{" "}
              <Link
                href={`/orders/${data.orders.find((o) => o.quoteId === q.id)?.id || "ORD-2026-001"}`}
                className="text-link"
              >
                View order
                <Icon name="arrow" size={16} />
              </Link>
            </div>
          )}
        </div>
        <aside className="detail-aside">
          <Card
            title="The numbers, clearly"
            subtitle="Internal quotation breakdown"
          >
            {total ? (
              <>
                <dl className="price-breakdown">
                  <div>
                    <dt>
                      Supplier cost{" "}
                      <small>
                        {q.quantity} kg × {money(q.unitCost)}
                      </small>
                    </dt>
                    <dd>{money(total.cost)}</dd>
                  </div>
                  <div>
                    <dt>Handling & packing</dt>
                    <dd>{money(q.handling)}</dd>
                  </div>
                  <div>
                    <dt>
                      Markup <small>{q.markup}% of cost + handling</small>
                    </dt>
                    <dd>{money(total.markup)}</dd>
                  </div>
                  <div className="price-divider">
                    <dt>Selling subtotal</dt>
                    <dd>{money(total.subtotal)}</dd>
                  </div>
                  <div>
                    <dt>Delivery</dt>
                    <dd>{money(q.delivery)}</dd>
                  </div>
                </dl>
                <div className="grand-total">
                  <span>Customer total</span>
                  <strong>{money(total.total)}</strong>
                </div>
                <div className="deposit-summary">
                  <div>
                    <span>Deposit ({q.deposit}%)</span>
                    <strong>{money(total.deposit)}</strong>
                  </div>
                  <div>
                    <span>Remaining balance</span>
                    <strong>{money(total.balance)}</strong>
                  </div>
                </div>
              </>
            ) : (
              <p className="form-error">
                Enter valid pricing to calculate totals.
              </p>
            )}
          </Card>
          <div className="aside-tip">
            <Icon name="file" size={22} />
            <h3>Simple for your customer.</h3>
            <p>
              The customer preview includes selling subtotal, delivery, deposit,
              and terms. Your sourcing details stay here.
            </p>
          </div>
        </aside>
      </div>
      {modal === "preview" && total && (
        <Dialog
          title="Customer quotation preview"
          onClose={() => setModal(null)}
        >
          <div className="customer-preview">
            <div className="preview-brand">
              <Icon name="fish" size={30} />
              <strong>IslaSource Seafoods</strong>
              <span>FROM OUR SHORES TO YOURS</span>
            </div>
            <div className="preview-meta">
              <div>
                <span>PREPARED FOR</span>
                <strong>{rfq?.customer}</strong>
                <small>{rfq?.location}</small>
              </div>
              <div>
                <span>QUOTATION</span>
                <strong>{q.id}</strong>
                <small>Valid for {q.validityDays ?? 2} days</small>
              </div>
            </div>
            <DataTable headers={["Item", "Quantity", "Amount"]}>
              <tr>
                <td>{product?.name}</td>
                <td>{q.quantity} kg</td>
                <td>{money(total.subtotal)}</td>
              </tr>
            </DataTable>
            <dl className="preview-totals">
              <div>
                <dt>Subtotal</dt>
                <dd>{money(total.subtotal)}</dd>
              </div>
              <div>
                <dt>Delivery</dt>
                <dd>{money(q.delivery)}</dd>
              </div>
              <div>
                <dt>Total</dt>
                <dd>{money(total.total)}</dd>
              </div>
              <div>
                <dt>Deposit to confirm ({q.deposit}%)</dt>
                <dd>{money(total.deposit)}</dd>
              </div>
              <div>
                <dt>Balance before dispatch</dt>
                <dd>{money(total.balance)}</dd>
              </div>
            </dl>
            <div className="preview-terms">
              <strong>A few thoughtful details</strong>
              <p>{q.terms}</p>
            </div>
            <p className="preview-demo-label">
              Sample quotation preview · No real payment instructions
            </p>
          </div>
          <div className="dialog-footer">
            <Button variant="secondary" onClick={() => setModal(null)}>
              Close preview
            </Button>
          </div>
        </Dialog>
      )}
      {modal === "send" && (
        <Dialog title="Send this quotation?" onClose={() => setModal(null)}>
          <div className="dialog-body">
            <span className="dialog-illustration">
              <Icon name="mail" size={28} />
            </span>
            <p>
              We’ll mark <strong>{q.id}</strong> as sent to{" "}
              <strong>{rfq?.customer}</strong> in the demo workspace.
            </p>
            <div className="soft-note">
              Prototype action only. No email, SMS, or other message will be
              delivered.
            </div>
          </div>
          <div className="dialog-footer">
            <Button variant="secondary" onClick={() => setModal(null)}>
              Keep editing
            </Button>
            <Button
              onClick={() => {
                save("Sent");
                setModal(null);
              }}
            >
              Simulate sending
              <Icon name="arrow" size={16} />
            </Button>
          </div>
        </Dialog>
      )}
      {modal === "accept" && (
        <Dialog title="Create a demo order?" onClose={() => setModal(null)}>
          <div className="dialog-body">
            <p>
              Accept this sample quotation and create an order for{" "}
              {rfq?.customer}. You can then try recording a demo payment and
              packing the order.
            </p>
            <div className="soft-note">
              No customer acceptance or payment is verified. This is a local
              demonstration.
            </div>
          </div>
          <div className="dialog-footer">
            <Button variant="secondary" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button onClick={accept}>Accept & create demo order</Button>
          </div>
        </Dialog>
      )}
    </>
  );
}

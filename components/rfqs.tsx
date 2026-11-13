"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDemo } from "./demo-provider";
import {
  BackLink,
  Badge,
  Button,
  ButtonLink,
  Card,
  DataTable,
  EmptyState,
  PageHeader,
  SearchFilter,
} from "./ui";
import { Icon } from "./ui/icon";
import { money, shortDate, type Quote } from "@/lib/data";
export function RfqList() {
  const { data } = useDemo();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const rows = data.rfqs.filter(
    (r) =>
      (status === "All" || r.status === status) &&
      `${r.customer} ${r.id} ${data.products.find((p) => p.id === r.productId)?.name}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        eyebrow="CUSTOMER CONVERSATIONS"
        title="Quote requests"
        description="Every good order starts with a conversation."
        actions={
          <div className="count-label">
            <span className="tiny-dot" />
            {data.rfqs.length} sample requests
          </div>
        }
      />
      <div className="summary-strip">
        <span>
          <strong>{data.rfqs.filter((r) => r.status === "New").length}</strong>
          New requests
        </span>
        <span>
          <strong>
            {data.rfqs.filter((r) => r.status === "Sourcing").length}
          </strong>
          Being sourced
        </span>
        <span>
          <strong>
            {data.rfqs.filter((r) => r.status === "Ready").length}
          </strong>
          Ready for a quote
        </span>
        <span>
          <strong>
            {data.rfqs.filter((r) => r.status === "Quoted").length}
          </strong>
          Quotation prepared
        </span>
      </div>
      <Card>
        <SearchFilter
          query={query}
          setQuery={setQuery}
          status={status}
          setStatus={setStatus}
          statuses={["New", "Sourcing", "Ready", "Quoted"]}
          placeholder="Search customer, request, or product…"
        />
        {rows.length ? (
          <DataTable
            headers={[
              "Request",
              "Customer",
              "Requested product",
              "Delivery",
              "Status",
              "",
            ]}
          >
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link className="table-primary" href={`/rfqs/${r.id}`}>
                    {r.id}
                  </Link>
                  <small>{r.date}</small>
                </td>
                <td>
                  <strong>{r.customer}</strong>
                  <small>{r.email}</small>
                </td>
                <td>
                  {data.products.find((p) => p.id === r.productId)?.name}
                  <small>{r.quantity} kg</small>
                </td>
                <td>
                  {r.location}
                  <small>{shortDate(r.deliveryDate)}</small>
                </td>
                <td>
                  <Badge>{r.status}</Badge>
                </td>
                <td>
                  <Link className="text-link" href={`/rfqs/${r.id}`}>
                    Review
                    <Icon name="arrow" size={15} />
                  </Link>
                </td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <EmptyState />
        )}
        <div className="table-footer">
          Showing {rows.length} of {data.rfqs.length} requests
          <span>Sample data · November 2026</span>
        </div>
      </Card>
    </>
  );
}

export function RfqDetail({ id }: { id: string }) {
  const { data, update, notify } = useDemo();
  const router = useRouter();
  const [note, setNote] = useState("");
  const r = data.rfqs.find((x) => x.id === id);
  if (!r)
    return (
      <>
        <PageHeader
          title="Request not found"
          description="This request is not in the demo workspace."
        />
        <ButtonLink href="/rfqs">Back to requests</ButtonLink>
      </>
    );
  const p = data.products.find((x) => x.id === r.productId);
  const quote = [...data.quotes].reverse().find((q) => q.rfqId === r.id);
  function selectSupplier(supplierId: string) {
    if (!r) return;
    const offer = r.offers.find((o) => o.supplierId === supplierId);
    if (!offer) return;
    update((d) => ({
      ...d,
      quotes: d.quotes.map((q) =>
        q.rfqId === id && q.status === "Draft"
          ? { ...q, unitCost: offer.unitCost, quantity: r.quantity }
          : q,
      ),
      rfqs: d.rfqs.map((x) =>
        x.id === id
          ? {
              ...x,
              selectedSupplier: supplierId,
              status: x.status === "Quoted" ? x.status : "Ready",
            }
          : x,
      ),
    }));
    notify(
      "Supplier selected. Draft pricing updated; sent quotations stay unchanged.",
    );
  }
  function prepareQuote() {
    if (!r) return;
    if (quote) {
      router.push(`/quotations/${quote.id}`);
      return;
    }
    const offer = r.offers.find((o) => o.supplierId === r.selectedSupplier);
    if (!offer) {
      notify("Select a supplier offer first.");
      return;
    }
    const q: Quote = {
      id: `QT-2026-${String(Math.max(...data.quotes.map((q) => Number(q.id.split("-").at(-1)))) + 1).padStart(3, "0")}`,
      rfqId: r.id,
      quantity: r.quantity,
      unitCost: offer.unitCost,
      handling: 20000,
      markup: 20,
      delivery: 35000,
      deposit: data.settings.deposit,
      status: "Draft",
      validityDays: data.settings.validity,
      terms: `${data.settings.deposit}% deposit confirms your order. Balance is due before dispatch.`,
    };
    update((d) => ({
      ...d,
      quotes: [...d.quotes, q],
      rfqs: d.rfqs.map((x) => (x.id === id ? { ...x, status: "Quoted" } : x)),
    }));
    router.push(`/quotations/${q.id}`);
  }
  return (
    <>
      <BackLink href="/rfqs">All quote requests</BackLink>
      <PageHeader
        eyebrow="QUOTE REQUEST"
        title={r.id}
        description={`Received ${r.date} · ${r.customer}`}
        actions={
          <>
            <Badge>{r.status}</Badge>
            <Button onClick={prepareQuote}>
              {quote ? "Open quotation" : "Prepare quotation"}
              <Icon name="arrow" size={17} />
            </Button>
          </>
        }
      />
      <div className="detail-grid">
        <div className="detail-main">
          <Card
            title="Requested products"
            subtitle="What the customer has in mind"
          >
            <div className="requested-product">
              {p && <Image src={p.image} alt={p.name} width={88} height={88} />}
              <div>
                <strong>{p?.name}</strong>
                <p>{p?.category}</p>
                <span className="quantity-pill">{r.quantity} kg requested</span>
              </div>
            </div>
            <div className="customer-note">
              <span className="eyebrow">CUSTOMER’S NOTE</span>
              <p>“{r.note}”</p>
            </div>
          </Card>
          <Card
            title="Source with confidence"
            subtitle="Compare private supplier offers before preparing your quotation"
            action={
              <span className="private-label">
                <Icon name="eye" size={14} />
                Admin only
              </span>
            }
          >
            <div className="supplier-offers">
              {r.offers.map((o) => {
                const s = data.suppliers.find((x) => x.id === o.supplierId);
                const selected = r.selectedSupplier === o.supplierId;
                return (
                  <div
                    key={o.supplierId}
                    className={`supplier-offer ${selected ? "selected" : ""}`}
                  >
                    <div className="offer-heading">
                      <div className="supplier-avatar">
                        <Icon name="people" size={20} />
                      </div>
                      <div>
                        <strong>{s?.name}</strong>
                        <small>{s?.location}</small>
                      </div>
                      <span className="offer-price">
                        {money(o.unitCost)}
                        <small>/ kg</small>
                      </span>
                    </div>
                    <p>
                      <span className="tiny-dot" />
                      {o.availability}
                    </p>
                    <div className="offer-footer">
                      <span>
                        Total supplier cost{" "}
                        <strong>{money(o.unitCost * r.quantity)}</strong>
                      </span>
                      <Button
                        variant={selected ? "secondary" : "primary"}
                        onClick={() => selectSupplier(o.supplierId)}
                      >
                        {selected && <Icon name="check" size={15} />}{" "}
                        {selected ? "Selected" : "Select offer"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
          <Card
            title="Internal notes"
            subtitle="A private place to keep the details together"
          >
            <div className="notes-list">
              {r.notes.length ? (
                r.notes.map((n, i) => (
                  <div className="note-item" key={i}>
                    <span className="avatar small">AC</span>
                    <div>
                      <strong>
                        Alex Cruz <small>· Demo note</small>
                      </strong>
                      <p>{n}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="muted">
                  No internal notes yet. Add a sourcing or delivery detail
                  below.
                </p>
              )}
            </div>
            <form
              className="note-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (!note.trim()) return;
                update((d) => ({
                  ...d,
                  rfqs: d.rfqs.map((x) =>
                    x.id === id
                      ? { ...x, notes: [...x.notes, note.trim()] }
                      : x,
                  ),
                }));
                setNote("");
                notify("Internal note saved in the demo.");
              }}
            >
              <label className="sr-only" htmlFor="internal-note">
                Add an internal note
              </label>
              <textarea
                id="internal-note"
                placeholder="Add a helpful detail for your team…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                required
              />
              <Button type="submit" variant="secondary">
                <Icon name="plus" size={16} />
                Add note
              </Button>
            </form>
          </Card>
        </div>
        <aside className="detail-aside">
          <Card title="Customer details">
            <div className="customer-profile">
              <div className="customer-avatar">
                {r.customer
                  .split(" ")
                  .map((x) => x[0])
                  .slice(0, 2)
                  .join("")}
              </div>
              <strong>{r.customer}</strong>
              <span>Sample customer</span>
            </div>
            <dl className="detail-lines">
              <div>
                <dt>
                  <Icon name="mail" size={16} />
                  Email
                </dt>
                <dd>{r.email}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{r.phone}</dd>
              </div>
            </dl>
          </Card>
          <Card title="Delivery details">
            <dl className="detail-lines">
              <div>
                <dt>
                  <Icon name="location" size={16} />
                  Deliver to
                </dt>
                <dd>{r.location}</dd>
              </div>
              <div>
                <dt>
                  <Icon name="clock" size={16} />
                  Requested date
                </dt>
                <dd>{shortDate(r.deliveryDate)}</dd>
              </div>
            </dl>
            <div className="soft-note">
              Final delivery timing is confirmed with the customer before
              dispatch.
            </div>
          </Card>
          <div className="aside-tip">
            <Icon name="leaf" size={23} />
            <h3>A fair price starts here.</h3>
            <p>
              Supplier cost and internal notes stay in your workspace. Your
              customer sees only the final quotation.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}

"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
import { rfqListPath, type ApiRfq, type ApiRfqPage } from "@/lib/rfqs";
import { useApiResource } from "./use-api-resource";

function LiveRfqInbox() {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);
  const path = rfqListPath({ per_page: 50, search, page });
  const { data, error, loading, retry } = useApiResource<ApiRfqPage>(path);
  const rows = data?.data ?? [];

  return (
    <section className="live-rfq-inbox">
      <PageHeader
        eyebrow="LIVE CUSTOMER REQUESTS"
        title="Guest quote inbox"
        description="Requests submitted from the public seafood catalog. Customer contact details are visible only to signed-in admins."
        actions={<div className="count-label">{data?.meta.total ?? (loading ? "Loading…" : 0)} live requests</div>}
      />
      <Card>
        <div className="list-toolbar">
          <div className="search-input">
            <Icon name="search" size={18} />
            <input
              aria-label="Search live quote requests"
              placeholder="Search reference, customer, email, or seafood…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && (
              <button aria-label="Clear search" onClick={() => setQuery("")}>
                <Icon name="close" size={16} />
              </button>
            )}
          </div>
        </div>
        {loading ? (
          <p className="loading-text">Loading live requests…</p>
        ) : error ? (
          <div className="empty-state">
            <Icon name="inbox" size={30} />
            <h3>Couldn’t load live requests</h3>
            <p>{error.message}</p>
            <Button variant="secondary" onClick={retry}>Try again</Button>
          </div>
        ) : rows.length ? (
          <DataTable headers={["Reference", "Customer", "Requested seafood", "Delivery", "Status", ""]}>
            {rows.map((rfq) => (
              <tr key={rfq.id}>
                <td>
                  <Link className="table-primary" href={`/rfqs/${rfq.id}`}>{rfq.reference}</Link>
                  <small>{new Date(rfq.created_at).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}</small>
                </td>
                <td>
                  <strong>{rfq.customer_name}</strong>
                  <small>{rfq.email}</small>
                </td>
                <td>
                  {rfq.items.map((item) => item.name).join(", ")}
                  <small>{rfq.items.length} {rfq.items.length === 1 ? "line item" : "line items"}</small>
                </td>
                <td>
                  {rfq.location}
                  <small>{rfq.requested_delivery_date ? shortDate(rfq.requested_delivery_date) : "Date not specified"}</small>
                </td>
                <td><Badge>{rfq.status}</Badge></td>
                <td>
                  <Link className="text-link" href={`/rfqs/${rfq.id}`}>
                    Review <Icon name="arrow" size={15} />
                  </Link>
                </td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <EmptyState
            title={query ? "No matching live requests" : "No guest requests yet"}
            description={query ? "Try another search." : "New requests from the public website will appear here."}
          />
        )}
        <div className="table-footer">
          <span>
            Showing {data?.meta.from ?? 0}–{data?.meta.to ?? 0} of {data?.meta.total ?? 0} live requests
          </span>
          <div className="pagination-controls">
            <Button
              variant="ghost"
              disabled={!data || page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>
            <span>Page {data?.meta.current_page ?? page} of {data?.meta.last_page ?? 1}</span>
            <Button
              variant="ghost"
              disabled={!data || page >= data.meta.last_page}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </div>
          <span>Live API data</span>
        </div>
      </Card>
    </section>
  );
}

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
      <LiveRfqInbox />
      <PageHeader
        eyebrow="CUSTOMER CONVERSATIONS"
        title="Prototype request examples"
        description="Sample workspace records for the existing sourcing and quotation prototype. Live guest submissions are listed above."
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
  if (/^\d+$/.test(id)) return <LiveRfqDetail id={Number(id)} />;
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

function LiveRfqDetail({ id }: { id: number }) {
  const { data, error, loading, retry } = useApiResource<{ data: ApiRfq }>(
    `/admin/rfqs/${id}`,
  );
  const rfq = data?.data;

  if (loading) {
    return (
      <>
        <BackLink href="/rfqs">All quote requests</BackLink>
        <p className="loading-text">Loading guest request…</p>
      </>
    );
  }
  if (error || !rfq) {
    return (
      <>
        <BackLink href="/rfqs">All quote requests</BackLink>
        <PageHeader
          title="Couldn’t open request"
          description={error?.message ?? "This request could not be found."}
          actions={<Button variant="secondary" onClick={retry}>Try again</Button>}
        />
      </>
    );
  }

  return (
    <>
      <BackLink href="/rfqs">All quote requests</BackLink>
      <PageHeader
        eyebrow="LIVE GUEST REQUEST"
        title={rfq.reference}
        description={`Received ${new Date(rfq.created_at).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}`}
        actions={<Badge>{rfq.status}</Badge>}
      />
      <div className="detail-grid">
        <div className="detail-main">
          <Card title="Requested seafood" subtitle="Customer selections and preferences">
            <div className="requested-products-list">
              {rfq.items.map((item) => (
                <article className="requested-product" key={item.id}>
                  <div className="customer-avatar"><Icon name="fish" size={20} /></div>
                  <div>
                    <strong>{item.name}</strong>
                    <p>{item.product_id === null ? "Custom request" : "Catalog item"}</p>
                    <span className="quantity-pill">{item.quantity} {item.unit} requested</span>
                    {item.notes && <p>{item.notes}</p>}
                  </div>
                </article>
              ))}
            </div>
            {rfq.notes && (
              <div className="customer-note">
                <span className="eyebrow">CUSTOMER’S NOTE</span>
                <p>{rfq.notes}</p>
              </div>
            )}
          </Card>
          <Card title="Next step" subtitle="The quote and supplier sourcing workflow will be connected in a later phase.">
            <p className="muted">This request is saved and ready for your team to review. No supplier price, markup, or payment information is attached.</p>
          </Card>
        </div>
        <aside className="detail-aside">
          <Card title="Customer details">
            <div className="customer-profile">
              <div className="customer-avatar">
                {rfq.customer_name.split(" ").map((part) => part[0]).slice(0, 2).join("")}
              </div>
              <strong>{rfq.customer_name}</strong>
              <span>Guest customer</span>
            </div>
            <dl className="detail-lines">
              <div><dt><Icon name="mail" size={16} /> Email</dt><dd>{rfq.email}</dd></div>
              <div><dt>Phone</dt><dd>{rfq.phone}</dd></div>
            </dl>
          </Card>
          <Card title="Delivery details">
            <dl className="detail-lines">
              <div><dt><Icon name="location" size={16} /> Deliver to</dt><dd>{rfq.location}</dd></div>
              <div><dt><Icon name="clock" size={16} /> Requested date</dt><dd>{rfq.requested_delivery_date ? shortDate(rfq.requested_delivery_date) : "Not specified"}</dd></div>
            </dl>
            <div className="soft-note">Confirm delivery timing and supplier availability before preparing a quote.</div>
          </Card>
        </aside>
      </div>
    </>
  );
}

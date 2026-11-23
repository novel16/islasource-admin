"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api";
import { shortDate, type Quote } from "@/lib/data";
import {
  createRfqsClient,
  rfqListPath,
  rfqStatuses,
  type ApiRfq,
  type ApiRfqNote,
  type ApiRfqPage,
  type RfqStatus,
} from "@/lib/rfqs";
import { useAuth } from "./auth-provider";
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
import { useApiResource } from "./use-api-resource";

function initialsFor(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => Array.from(part)[0])
      .join("")
      .toUpperCase() || "A"
  );
}

function LiveRfqInbox() {
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
  const path = rfqListPath({ per_page: 15, search, status, page });
  const { data, error, loading, retry } = useApiResource<ApiRfqPage>(path);
  const rows = data?.data ?? [];

  return (
    <section className="live-rfq-inbox">
      <PageHeader
        eyebrow="LIVE CUSTOMER REQUESTS"
        title="Guest quote inbox"
        description="Requests submitted from the public seafood catalog. Customer contact details and internal notes are visible only to signed-in admins."
        actions={
          <div className="count-label">
            {data?.meta.total ?? (loading ? "Loading…" : 0)} live requests
          </div>
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
          statuses={[...rfqStatuses]}
          placeholder="Search reference, customer, email, or seafood…"
        />
        {loading ? (
          <p className="loading-text">Loading live requests…</p>
        ) : error ? (
          <div className="empty-state">
            <Icon name="inbox" size={30} />
            <h3>Couldn’t load live requests</h3>
            <p>{error.message}</p>
            <Button variant="secondary" onClick={retry}>
              Try again
            </Button>
          </div>
        ) : rows.length ? (
          <DataTable
            headers={[
              "Reference",
              "Customer",
              "Requested seafood",
              "Delivery",
              "Status",
              "",
            ]}
          >
            {rows.map((rfq) => (
              <tr key={rfq.id}>
                <td>
                  <Link className="table-primary" href={`/rfqs/${rfq.id}`}>
                    {rfq.reference}
                  </Link>
                  <small>
                    {new Date(rfq.created_at).toLocaleString("en-PH", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </small>
                </td>
                <td>
                  <strong>{rfq.customer_name}</strong>
                  <small>{rfq.email}</small>
                </td>
                <td>
                  {rfq.items.map((item) => item.name).join(", ")}
                  <small>
                    {rfq.items.length}{" "}
                    {rfq.items.length === 1 ? "line item" : "line items"}
                  </small>
                </td>
                <td>
                  {rfq.location}
                  <small>
                    {rfq.requested_delivery_date
                      ? shortDate(rfq.requested_delivery_date)
                      : "Date not specified"}
                  </small>
                </td>
                <td>
                  <Badge>{rfq.status}</Badge>
                </td>
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
            title={
              query || status !== "All"
                ? "No matching live requests"
                : "No guest requests yet"
            }
            description={
              query || status !== "All"
                ? "Try another search or status filter."
                : "New requests from the public website will appear here."
            }
          />
        )}
        <div className="table-footer">
          <span>
            Showing {data?.meta.from ?? 0}–{data?.meta.to ?? 0} of{" "}
            {data?.meta.total ?? 0} live requests
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
        description="Sample workspace records for the existing quotation prototype. Live guest submissions are listed above."
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
            {data.rfqs.filter((r) => r.status === "Reviewing").length}
          </strong>
          Under review
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
          statuses={["New", "Reviewing", "Ready", "Quoted"]}
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
  function prepareQuote() {
    if (!r) return;
    if (quote) {
      router.push(`/quotations/${quote.id}`);
      return;
    }
    const q: Quote = {
      id: `QT-2026-${String(Math.max(...data.quotes.map((x) => Number(x.id.split("-").at(-1)))) + 1).padStart(3, "0")}`,
      rfqId: r.id,
      quantity: r.quantity,
      unitCost: 50000,
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
                {initialsFor(r.customer)}
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
              Internal notes and pricing details stay in your workspace. Your
              customer sees only the final quotation.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}

function LiveRfqDetail({ id }: { id: number }) {
  const { request } = useAuth();
  const { notify } = useDemo();
  const { data, error, loading, retry } = useApiResource<{ data: ApiRfq }>(
    `/admin/rfqs/${id}`,
  );
  const [savedRfq, setSavedRfq] = useState<ApiRfq | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteError, setNoteError] = useState("");

  const rfq = savedRfq?.id === id ? savedRfq : data?.data ?? null;

  async function changeStatus(nextStatus: RfqStatus) {
    if (!rfq || statusSaving || nextStatus === rfq.status) return;
    setStatusSaving(true);
    setStatusError("");
    try {
      const updated = await createRfqsClient(request).updateStatus(
        rfq.id,
        nextStatus,
      );
      setSavedRfq(updated);
      notify(`Request marked as ${updated.status}.`);
    } catch (failure) {
      setStatusError(
        failure instanceof ApiError
          ? failure.errors.status?.[0] || failure.message
          : "We couldn’t update the request status. Please try again.",
      );
    } finally {
      setStatusSaving(false);
    }
  }

  async function submitNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rfq || noteSaving) return;
    setNoteSaving(true);
    setNoteError("");
    try {
      const created: ApiRfqNote = await createRfqsClient(request).addNote(
        rfq.id,
        noteBody,
      );
      setSavedRfq({
        ...rfq,
        internal_notes: [...(rfq.internal_notes ?? []), created],
      });
      setNoteBody("");
      notify("Internal note saved.");
    } catch (failure) {
      setNoteError(
        failure instanceof ApiError
          ? failure.errors.body?.[0] || failure.message
          : "We couldn’t save this note. Please try again.",
      );
    } finally {
      setNoteSaving(false);
    }
  }

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
          actions={
            <Button variant="secondary" onClick={retry}>
              Try again
            </Button>
          }
        />
      </>
    );
  }

  const notes = rfq.internal_notes ?? [];

  return (
    <>
      <BackLink href="/rfqs">All quote requests</BackLink>
      <PageHeader
        eyebrow="LIVE GUEST REQUEST"
        title={rfq.reference}
        description={`Received ${new Date(rfq.created_at).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}`}
        actions={
          <>
            <Badge>{rfq.status}</Badge>
            <select
              className="status-select"
              aria-label="Update request status"
              value={rfq.status}
              disabled={statusSaving}
              onChange={(event) =>
                void changeStatus(event.target.value as RfqStatus)
              }
            >
              {rfqStatuses.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </>
        }
      />
      {statusError && (
        <p className="form-error" role="alert">
          {statusError}
        </p>
      )}
      <div className="detail-grid">
        <div className="detail-main">
          <Card
            title="Requested seafood"
            subtitle="Customer selections and preferences"
          >
            <div className="requested-products-list">
              {rfq.items.map((item) => (
                <article className="requested-product" key={item.id}>
                  <div className="customer-avatar">
                    <Icon name="fish" size={20} />
                  </div>
                  <div>
                    <strong>{item.name}</strong>
                    <p>
                      {item.product_id === null
                        ? "Custom request"
                        : "Catalog item"}
                    </p>
                    <span className="quantity-pill">
                      {item.quantity} {item.unit} requested
                    </span>
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
          <Card
            title="Internal notes"
            subtitle="Private notes for your workspace — never shown to customers"
            action={
              <span className="private-label">
                <Icon name="eye" size={14} />
                Admin only
              </span>
            }
          >
            <div className="notes-list">
              {notes.length ? (
                notes.map((entry) => (
                  <div className="note-item" key={entry.id}>
                    <span className="avatar small">
                      {initialsFor(entry.author_name)}
                    </span>
                    <div>
                      <strong>
                        {entry.author_name}{" "}
                        <small>
                          ·{" "}
                          {new Date(entry.created_at).toLocaleString("en-PH", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </small>
                      </strong>
                      <p>{entry.body}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="muted">
                  No internal notes yet. Record availability checks, market
                  prices, or delivery notes below.
                </p>
              )}
            </div>
            <form
              className="note-form"
              onSubmit={(event) => void submitNote(event)}
              aria-busy={noteSaving}
            >
              <label className="sr-only" htmlFor="live-internal-note">
                Add an internal note
              </label>
              <textarea
                id="live-internal-note"
                placeholder="Add availability, pricing, or delivery notes for this request…"
                maxLength={2000}
                value={noteBody}
                disabled={noteSaving}
                onChange={(event) => {
                  setNoteBody(event.target.value);
                  if (noteError) setNoteError("");
                }}
                required
              />
              {noteError && (
                <p className="form-error" role="alert">
                  {noteError}
                </p>
              )}
              <Button type="submit" variant="secondary" disabled={noteSaving}>
                <Icon name="plus" size={16} />
                {noteSaving ? "Saving…" : "Add note"}
              </Button>
            </form>
          </Card>
        </div>
        <aside className="detail-aside">
          <Card title="Customer details">
            <div className="customer-profile">
              <div className="customer-avatar">
                {initialsFor(rfq.customer_name)}
              </div>
              <strong>{rfq.customer_name}</strong>
              <span>Guest customer</span>
            </div>
            <dl className="detail-lines">
              <div>
                <dt>
                  <Icon name="mail" size={16} /> Email
                </dt>
                <dd>{rfq.email}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{rfq.phone}</dd>
              </div>
            </dl>
          </Card>
          <Card title="Delivery details">
            <dl className="detail-lines">
              <div>
                <dt>
                  <Icon name="location" size={16} /> Deliver to
                </dt>
                <dd>{rfq.location}</dd>
              </div>
              <div>
                <dt>
                  <Icon name="clock" size={16} /> Requested date
                </dt>
                <dd>
                  {rfq.requested_delivery_date
                    ? shortDate(rfq.requested_delivery_date)
                    : "Not specified"}
                </dd>
              </div>
            </dl>
            <div className="soft-note">
              Confirm delivery timing and availability before preparing a quote.
            </div>
          </Card>
          <div className="aside-tip">
            <Icon name="leaf" size={23} />
            <h3>Private to your workspace.</h3>
            <p>
              Status updates and internal notes are saved securely in Laravel
              and are never exposed on public endpoints.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}

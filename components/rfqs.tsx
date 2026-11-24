"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api";
import { money, shortDate } from "@/lib/data";
import { createQuotationsClient } from "@/lib/quotations";
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
import { useWorkspace } from "./workspace-provider";
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

export function RfqList() {
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
        eyebrow="CUSTOMER REQUESTS"
        title="Quote requests"
        description="Requests submitted from the public seafood catalog. Customer contact details and internal notes are visible only to signed-in admins."
        actions={
          <div className="count-label">
            {data?.meta.total ?? (loading ? "Loading…" : 0)} requests
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
          <p className="loading-text">Loading quote requests…</p>
        ) : error ? (
          <div className="empty-state">
            <Icon name="inbox" size={30} />
            <h3>Couldn’t load quote requests</h3>
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
                ? "No matching requests"
                : "No quote requests yet"
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
            {data?.meta.total ?? 0} requests
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
          <span>Prices confirmed per request</span>
        </div>
      </Card>
    </section>
  );
}

export function RfqDetail({ id }: { id: string }) {
  if (/^\d+$/.test(id)) return <LiveRfqDetail id={Number(id)} />;
  return (
    <>
      <BackLink href="/rfqs">All quote requests</BackLink>
      <PageHeader
        title="Request not found"
        description="Check your quote requests list to open a valid record."
      />
      <ButtonLink href="/rfqs">Back to requests</ButtonLink>
    </>
  );
}

function LiveRfqDetail({ id }: { id: number }) {
  const { request } = useAuth();
  const { settings, notify } = useWorkspace();
  const router = useRouter();
  const { data, error, loading, retry } = useApiResource<{ data: ApiRfq }>(
    `/admin/rfqs/${id}`,
  );
  const [savedRfq, setSavedRfq] = useState<ApiRfq | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [creatingQuote, setCreatingQuote] = useState(false);
  const [noteBody, setNoteBody] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteError, setNoteError] = useState("");

  const rfq = savedRfq?.id === id ? savedRfq : (data?.data ?? null);
  const linkedQuotations = rfq?.quotations ?? [];
  const draftQuotation = linkedQuotations.find((q) => q.status === "Draft");
  const acceptedQuotation = linkedQuotations.find(
    (q) => q.status === "Accepted",
  );

  async function prepareLiveQuote() {
    if (!rfq || creatingQuote) return;
    if (draftQuotation) {
      router.push(`/quotations/${draftQuotation.id}`);
      return;
    }
    if (acceptedQuotation) {
      router.push(`/quotations/${acceptedQuotation.id}`);
      return;
    }
    setCreatingQuote(true);
    setStatusError("");
    try {
      const created = await createQuotationsClient(request).createForRfq(
        rfq.id,
        {
          validity_hours: Math.min(720, Math.max(1, settings.validity * 24)),
        },
      );
      router.push(`/quotations/${created.id}`);
    } catch (failure) {
      setStatusError(
        failure instanceof ApiError
          ? Object.values(failure.errors).flat()[0] || failure.message
          : "We couldn’t create a quotation draft. Please try again.",
      );
    } finally {
      setCreatingQuote(false);
    }
  }

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
        <p className="loading-text">Loading quote request…</p>
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
        eyebrow="QUOTE REQUEST"
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
            {(draftQuotation ||
              acceptedQuotation ||
              rfq.status !== "Closed") && (
              <Button
                disabled={creatingQuote}
                onClick={() => void prepareLiveQuote()}
              >
                {creatingQuote
                  ? "Preparing…"
                  : draftQuotation
                    ? "Open draft quotation"
                    : acceptedQuotation
                      ? "View accepted quotation"
                      : "Prepare quotation"}
                <Icon name="arrow" size={17} />
              </Button>
            )}
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
          {linkedQuotations.length > 0 && (
            <Card
              title="Quotations"
              subtitle="Versioned quotations prepared for this request"
            >
              <DataTable
                headers={["Quotation", "Version", "Total", "Status", ""]}
              >
                {linkedQuotations.map((q) => (
                  <tr key={q.id}>
                    <td>
                      <Link
                        className="table-primary"
                        href={`/quotations/${q.id}`}
                      >
                        {q.reference}
                      </Link>
                    </td>
                    <td>v{q.version}</td>
                    <td className="money">{money(q.total_centavos)}</td>
                    <td>
                      <Badge>{q.status}</Badge>
                    </td>
                    <td>
                      <Link className="text-link" href={`/quotations/${q.id}`}>
                        {q.status === "Draft" ? "Continue" : "Open"}
                        <Icon name="arrow" size={15} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </DataTable>
            </Card>
          )}
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

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, apiEndpoints } from "@/lib/api";
import { money, shortDate } from "@/lib/data";
import {
  createQuotationsClient,
  formatValidityHours,
  previewQuotationTotals,
  quotationListPath,
  quotationStatuses,
  type ApiQuotation,
  type ApiQuotationPage,
  type UpdateQuotationPayload,
} from "@/lib/quotations";
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

const validityPresets = [
  { hours: 12, label: "12 hours" },
  { hours: 24, label: "24 hours (1 day)" },
  { hours: 48, label: "48 hours (2 days)" },
  { hours: 72, label: "72 hours (3 days)" },
];

type EditableLine = {
  id: number;
  product_name: string;
  unit: "kg" | "pack" | "piece";
  quantity: string;
  specs: string;
  is_available: boolean;
  unit_cost_pesos: string;
};

type DraftFormState = {
  handling_pesos: string;
  markup_percent: string;
  delivery_pesos: string;
  deposit_percent: string;
  validity_hours: string;
  terms: string;
  items: EditableLine[];
};

function pesosToCentavos(value: string): number {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.round(num * 100);
}

function centavosToInput(centavos: number): string {
  return (centavos / 100).toFixed(2);
}

function formFromQuotation(q: ApiQuotation): DraftFormState {
  return {
    handling_pesos: centavosToInput(q.handling_centavos),
    markup_percent: String(Number(q.markup_percent)),
    delivery_pesos: centavosToInput(q.delivery_centavos),
    deposit_percent: String(q.deposit_percent),
    validity_hours: String(q.validity_hours),
    terms: q.terms,
    items: (q.items ?? []).map((item) => ({
      id: item.id,
      product_name: item.product_name,
      unit: item.unit,
      quantity: String(Number(item.quantity)),
      specs: item.specs,
      is_available: item.is_available,
      unit_cost_pesos: centavosToInput(item.unit_cost_centavos),
    })),
  };
}

function buildUpdatePayload(form: DraftFormState): UpdateQuotationPayload {
  return {
    handling_centavos: pesosToCentavos(form.handling_pesos),
    markup_percent: Number(form.markup_percent || 0).toFixed(2),
    delivery_centavos: pesosToCentavos(form.delivery_pesos),
    deposit_percent: Math.min(
      100,
      Math.max(0, Math.round(Number(form.deposit_percent || 0))),
    ),
    validity_hours: Math.min(
      720,
      Math.max(1, Math.round(Number(form.validity_hours || 48))),
    ),
    terms: form.terms.trim(),
    items: form.items.map((item) => ({
      id: item.id,
      quantity: String(item.quantity),
      specs: item.specs.trim(),
      is_available: item.is_available,
      unit_cost_centavos: pesosToCentavos(item.unit_cost_pesos),
    })),
  };
}

export function LiveQuotationList() {
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

  const path = quotationListPath({ search, status, page, per_page: 15 });
  const { data, error, loading, retry } =
    useApiResource<ApiQuotationPage>(path);
  const rows = data?.data ?? [];

  return (
    <section className="live-rfq-inbox">
      <PageHeader
        eyebrow="LIVE CUSTOMER QUOTATIONS"
        title="Quotations"
        description="Server-calculated customer quotations created from live guest requests. Base costs and markup stay private."
        actions={
          <ButtonLink href="/rfqs" variant="secondary">
            <Icon name="plus" size={17} />
            Create from a live request
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
          statuses={[...quotationStatuses]}
          placeholder="Search quotation reference, RFQ, or customer…"
        />
        {loading ? (
          <p className="loading-text">Loading live quotations…</p>
        ) : error ? (
          <div className="empty-state">
            <Icon name="file" size={30} />
            <h3>Couldn’t load live quotations</h3>
            <p>{error.message}</p>
            <Button variant="secondary" onClick={retry}>
              Try again
            </Button>
          </div>
        ) : rows.length ? (
          <DataTable
            headers={[
              "Quotation",
              "Customer",
              "Total (Full)",
              "Payment",
              "Status",
              "",
            ]}
          >
            {rows.map((q) => (
              <tr key={q.id}>
                <td>
                  <Link className="table-primary" href={`/quotations/${q.id}`}>
                    {q.reference}
                  </Link>
                  <small>
                    v{q.version} · {q.rfq?.reference ?? `RFQ #${q.rfq_id}`}
                  </small>
                </td>
                <td>
                  <strong>{q.rfq?.customer_name ?? "Guest"}</strong>
                  <small>
                    {q.item_count ?? 0}{" "}
                    {q.item_count === 1 ? "line item" : "line items"} ·{" "}
                    {q.rfq?.location ?? ""}
                  </small>
                </td>
                <td className="money">{money(q.total_centavos)}</td>
                <td>
                  100% QR Ph
                  <small>Full payment before sourcing</small>
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
            ))}
          </DataTable>
        ) : (
          <EmptyState
            title={
              query || status !== "All"
                ? "No matching live quotations"
                : "No live quotations yet"
            }
            description={
              query || status !== "All"
                ? "Try another search or status filter."
                : "Open any live guest request to prepare your first quotation."
            }
          />
        )}
        <div className="table-footer">
          <span>
            Showing {data?.meta.from ?? 0}–{data?.meta.to ?? 0} of{" "}
            {data?.meta.total ?? 0} live quotations
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
          <span>Live API data · PHP</span>
        </div>
      </Card>
    </section>
  );
}

export function LiveQuotationDetail({ id }: { id: number }) {
  const { data, error, loading, retry } = useApiResource<{
    data: ApiQuotation;
  }>(apiEndpoints.quotation(id));

  if (loading) {
    return (
      <>
        <BackLink href="/quotations">All quotations</BackLink>
        <p className="loading-text">Loading quotation…</p>
      </>
    );
  }
  if (error || !data?.data) {
    return (
      <>
        <BackLink href="/quotations">All quotations</BackLink>
        <PageHeader
          title="Couldn’t open quotation"
          description={error?.message ?? "This quotation could not be found."}
          actions={
            <Button variant="secondary" onClick={retry}>
              Try again
            </Button>
          }
        />
      </>
    );
  }
  return <LiveQuotationEditor key={data.data.id} initial={data.data} />;
}

function LiveQuotationEditor({ initial }: { initial: ApiQuotation }) {
  const { request } = useAuth();
  const { notify } = useWorkspace();
  const router = useRouter();
  const [quotation, setQuotation] = useState<ApiQuotation>(initial);
  const [form, setForm] = useState<DraftFormState>(() =>
    formFromQuotation(initial),
  );
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [modal, setModal] = useState<
    "preview" | "send" | "cancel" | "discard" | null
  >(null);

  const readOnly = quotation.status !== "Draft";
  const client = createQuotationsClient(request);

  const preview = readOnly
    ? {
        items: (quotation.items ?? []).map((item) => ({
          line_cost_centavos: item.line_cost_centavos,
          line_selling_centavos: item.line_selling_centavos,
        })),
        seafood_cost_centavos: quotation.seafood_cost_centavos,
        handling_centavos: quotation.handling_centavos,
        markup_centavos: quotation.markup_centavos,
        subtotal_centavos: quotation.subtotal_centavos,
        delivery_centavos: quotation.delivery_centavos,
        total_centavos: quotation.total_centavos,
        deposit_centavos: quotation.deposit_centavos,
        balance_centavos: quotation.balance_centavos,
      }
    : previewQuotationTotals({
        items: form.items.map((item) => ({
          quantity: item.quantity,
          unit_cost_centavos: pesosToCentavos(item.unit_cost_pesos),
          is_available: item.is_available,
        })),
        handling_centavos: pesosToCentavos(form.handling_pesos),
        markup_percent: form.markup_percent,
        delivery_centavos: pesosToCentavos(form.delivery_pesos),
        deposit_percent: Number(form.deposit_percent || 0),
      });

  const hasAvailable = form.items.some((item) => item.is_available);
  const hasZeroAvailableCost = form.items.some(
    (item) => item.is_available && pesosToCentavos(item.unit_cost_pesos) <= 0,
  );
  const canSend =
    !readOnly &&
    hasAvailable &&
    !hasZeroAvailableCost &&
    preview.total_centavos > 0 &&
    form.terms.trim().length > 0;

  const versions = quotation.versions ?? [];
  const hasAcceptedVersion = versions.some((v) => v.status === "Accepted");
  const existingDraftVersion = versions.find((v) => v.status === "Draft");
  const canRevise =
    readOnly && !hasAcceptedVersion && quotation.rfq?.status !== "Closed";

  function updateField<K extends keyof DraftFormState>(
    key: K,
    value: DraftFormState[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setDirty(true);
    setError("");
  }

  function updateItem(index: number, patch: Partial<EditableLine>) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
    }));
    setDirty(true);
    setError("");
  }

  async function saveDraft(): Promise<ApiQuotation | null> {
    if (readOnly) return quotation;
    setBusy(true);
    setError("");
    try {
      const updated = await client.update(
        quotation.id,
        buildUpdatePayload(form),
      );
      setQuotation(updated);
      setForm(formFromQuotation(updated));
      setDirty(false);
      notify("Quotation draft saved.");
      return updated;
    } catch (failure) {
      setError(
        failure instanceof ApiError
          ? Object.values(failure.errors).flat()[0] || failure.message
          : "We couldn’t save this quotation. Please try again.",
      );
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function confirmSend() {
    setBusy(true);
    setError("");
    try {
      if (dirty) {
        const saved = await client.update(
          quotation.id,
          buildUpdatePayload(form),
        );
        setQuotation(saved);
        setForm(formFromQuotation(saved));
        setDirty(false);
      }
      const sent = await client.send(quotation.id);
      setQuotation(sent);
      setForm(formFromQuotation(sent));
      setModal(null);
      notify(
        sent.email_sent
          ? `Quotation sent to ${sent.rfq?.email ?? "customer"}.`
          : "Quotation locked as Sent, but email delivery failed. Copy the link or retry sending.",
      );
    } catch (failure) {
      setModal(null);
      setError(
        failure instanceof ApiError
          ? Object.values(failure.errors).flat()[0] || failure.message
          : "We couldn’t send this quotation. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleResend() {
    setBusy(true);
    setError("");
    try {
      const updated = await client.resend(quotation.id);
      setQuotation(updated);
      notify(
        updated.email_sent
          ? `Quotation email re-sent to ${updated.rfq?.email ?? "customer"}.`
          : "Email resend failed. You can still copy the quote link.",
      );
    } catch (failure) {
      setError(
        failure instanceof ApiError
          ? Object.values(failure.errors).flat()[0] || failure.message
          : "We couldn’t resend the email right now.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function confirmCancel() {
    setBusy(true);
    setError("");
    try {
      const updated = await client.cancel(quotation.id, cancelReason);
      setQuotation(updated);
      setModal(null);
      setCancelReason("");
      notify("Quotation withdrawn. The guest link can no longer be accepted.");
    } catch (failure) {
      setModal(null);
      setError(
        failure instanceof ApiError
          ? Object.values(failure.errors).flat()[0] || failure.message
          : "We couldn’t withdraw this quotation.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function confirmDiscard() {
    setBusy(true);
    setError("");
    try {
      await client.discard(quotation.id);
      setModal(null);
      notify("Draft quotation discarded.");
      router.replace(`/rfqs/${quotation.rfq_id}`);
    } catch (failure) {
      setModal(null);
      setError(
        failure instanceof ApiError
          ? Object.values(failure.errors).flat()[0] || failure.message
          : "We couldn’t discard this draft.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleRevise() {
    if (existingDraftVersion) {
      router.push(`/quotations/${existingDraftVersion.id}`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const revision = await client.revise(quotation.id);
      notify(`Draft v${revision.version} created. Previous version unchanged.`);
      router.push(`/quotations/${revision.id}`);
    } catch (failure) {
      setError(
        failure instanceof ApiError
          ? Object.values(failure.errors).flat()[0] || failure.message
          : "We couldn’t create a revision.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function copyShareUrl() {
    if (!quotation.share_url) return;
    try {
      await navigator.clipboard.writeText(quotation.share_url);
      setCopied(true);
      notify("Customer quote link copied to clipboard.");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      notify("Copy failed. Select and copy the link from the box.");
    }
  }

  return (
    <>
      <BackLink href="/quotations">All quotations</BackLink>
      <PageHeader
        eyebrow={`LIVE QUOTATION · VERSION ${quotation.version}`}
        title={quotation.reference}
        description={`${quotation.rfq?.customer_name ?? "Guest"} · Based on ${quotation.rfq?.reference ?? `RFQ #${quotation.rfq_id}`}`}
        actions={
          <>
            <Badge>{quotation.status}</Badge>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => setModal("preview")}
            >
              <Icon name="eye" size={17} />
              Customer preview
            </Button>
            {canRevise && (
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => void handleRevise()}
              >
                <Icon name="plus" size={16} />
                {existingDraftVersion ? "Open draft revision" : "Create revision"}
              </Button>
            )}
            {quotation.status === "Sent" && (
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => setModal("cancel")}
              >
                Withdraw
              </Button>
            )}
            {!readOnly && (
              <>
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => setModal("discard")}
                >
                  Discard
                </Button>
                <Button
                  disabled={busy || !canSend}
                  onClick={() => setModal("send")}
                >
                  <Icon name="mail" size={17} />
                  Send quotation
                </Button>
              </>
            )}
          </>
        }
      />

      {versions.length > 1 && (
        <div className="version-strip" aria-label="Quotation versions">
          <span>Versions:</span>
          {versions.map((v) => (
            <Link
              key={v.id}
              href={`/quotations/${v.id}`}
              className={`version-pill ${v.id === quotation.id ? "current" : ""}`}
            >
              v{v.version} · {v.status}
            </Link>
          ))}
        </div>
      )}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {readOnly && quotation.share_url && (
        <Card
          title="Customer link & email delivery"
          subtitle={
            quotation.last_emailed_at
              ? `Last emailed to ${quotation.rfq?.email} on ${new Date(quotation.last_emailed_at).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}`
              : `Recipient: ${quotation.rfq?.email}`
          }
          className="share-card"
        >
          <div className="share-card-body">
            <div className="share-url-row">
              <input
                aria-label="Customer quote link"
                readOnly
                value={quotation.share_url}
                onFocus={(event) => event.currentTarget.select()}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => void copyShareUrl()}
              >
                <Icon name="check" size={15} />
                {copied ? "Copied" : "Copy link"}
              </Button>
              {quotation.status === "Sent" && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void handleResend()}
                >
                  <Icon name="mail" size={15} />
                  {busy ? "Sending…" : "Resend email"}
                </Button>
              )}
            </div>
            {quotation.last_email_error && (
              <p className="form-error" role="alert">
                {quotation.last_email_error}
              </p>
            )}
            {quotation.valid_until && (
              <p className="muted small-text">
                Valid until{" "}
                {new Date(quotation.valid_until).toLocaleString("en-PH", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
                {quotation.status === "Declined" && quotation.decline_reason
                  ? ` · Customer note: “${quotation.decline_reason}”`
                  : ""}
                {quotation.status === "Cancelled" && quotation.cancel_reason
                  ? ` · Withdrawn: ${quotation.cancel_reason}`
                  : ""}
              </p>
            )}
          </div>
        </Card>
      )}

      <div className="detail-grid quote-grid">
        <div className="detail-main">
          <Card
            title="Build a fair quotation"
            subtitle="Private per-item costs · all customer totals calculated by Laravel in centavos"
            action={
              <span className="private-label">
                <Icon name="eye" size={14} />
                Admin only
              </span>
            }
          >
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void saveDraft();
              }}
            >
              <div className="quote-lines-list">
                {form.items.map((item, index) => {
                  const linePreview = preview.items[index] ?? {
                    line_cost_centavos: 0,
                    line_selling_centavos: 0,
                  };
                  return (
                    <div
                      key={item.id}
                      className={`quote-line-card ${item.is_available ? "" : "unavailable"}`}
                    >
                      <div className="quote-line-top">
                        <div>
                          <strong>{item.product_name}</strong>
                          <small>Selling unit: {item.unit}</small>
                        </div>
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            disabled={readOnly || busy}
                            checked={item.is_available}
                            onChange={(event) =>
                              updateItem(index, {
                                is_available: event.target.checked,
                              })
                            }
                          />
                          Available
                        </label>
                      </div>
                      <div className="quote-line-fields">
                        <Field label={`Qty (${item.unit})`}>
                          <input
                            type="number"
                            min="0.001"
                            max="9999999.999"
                            step={item.unit === "kg" ? "0.001" : "1"}
                            required
                            disabled={readOnly || busy}
                            value={item.quantity}
                            onChange={(event) =>
                              updateItem(index, {
                                quantity: event.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field label={`Unit cost / ${item.unit} (₱)`}>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            disabled={readOnly || busy || !item.is_available}
                            value={item.unit_cost_pesos}
                            onChange={(event) =>
                              updateItem(index, {
                                unit_cost_pesos: event.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field
                          label={
                            item.is_available
                              ? "Confirmed grade / packing"
                              : "Unavailability note"
                          }
                          className="quote-line-specs"
                        >
                          <input
                            type="text"
                            maxLength={500}
                            disabled={readOnly || busy}
                            placeholder={
                              item.is_available
                                ? "Size, grade, or packing note…"
                                : "e.g. No morning catch today"
                            }
                            value={item.specs}
                            onChange={(event) =>
                              updateItem(index, { specs: event.target.value })
                            }
                          />
                        </Field>
                      </div>
                      <div className="quote-line-summary">
                        <span>
                          Base cost:{" "}
                          <strong>
                            {money(linePreview.line_cost_centavos)}
                          </strong>
                        </span>
                        <span>
                          Customer line amount:{" "}
                          <strong>
                            {item.is_available
                              ? money(linePreview.line_selling_centavos)
                              : "Unavailable (₱0.00)"}
                          </strong>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="form-grid">
                <Field label="Handling & packing (₱)">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    disabled={readOnly || busy}
                    value={form.handling_pesos}
                    onChange={(event) =>
                      updateField("handling_pesos", event.target.value)
                    }
                  />
                </Field>
                <Field label="Markup on cost + handling (%)">
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    step="0.01"
                    required
                    disabled={readOnly || busy}
                    value={form.markup_percent}
                    onChange={(event) =>
                      updateField("markup_percent", event.target.value)
                    }
                  />
                </Field>
                <Field label="Delivery fee (₱)">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    disabled={readOnly || busy}
                    value={form.delivery_pesos}
                    onChange={(event) =>
                      updateField("delivery_pesos", event.target.value)
                    }
                  />
                </Field>
                <Field label="Payment terms">
                  <input
                    type="text"
                    readOnly
                    disabled
                    value="100% Full Payment (QR Ph)"
                  />
                </Field>
                <Field
                  label="Quotation validity (hours)"
                  hint={`Default 48 hours (2 days). Selected: ${formatValidityHours(Math.max(1, Number(form.validity_hours) || 48))}.`}
                  className="full"
                >
                  <div className="validity-controls">
                    <input
                      type="number"
                      min="1"
                      max="720"
                      step="1"
                      required
                      disabled={readOnly || busy}
                      value={form.validity_hours}
                      onChange={(event) =>
                        updateField("validity_hours", event.target.value)
                      }
                    />
                    <div className="preset-buttons">
                      {validityPresets.map((preset) => (
                        <button
                          key={preset.hours}
                          type="button"
                          disabled={readOnly || busy}
                          className={
                            Number(form.validity_hours) === preset.hours
                              ? "selected"
                              : ""
                          }
                          onClick={() =>
                            updateField("validity_hours", String(preset.hours))
                          }
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </Field>
              </div>

              <div className="calculation-note">
                <Icon name="help" size={16} />
                <p>
                  Markup applies to total base seafood cost plus handling.
                  Handling and markup are folded proportionally into customer
                  line amounts so base costs stay private.
                </p>
              </div>

              <div className="form-section">
                <Field label="Customer-facing terms">
                  <textarea
                    rows={3}
                    maxLength={2000}
                    required
                    disabled={readOnly || busy}
                    value={form.terms}
                    onChange={(event) =>
                      updateField("terms", event.target.value)
                    }
                  />
                </Field>
                {!readOnly && hasZeroAvailableCost && (
                  <p className="muted small-text">
                    Enter a unit cost greater than ₱0.00 for every available
                    item (or uncheck Available) before sending.
                  </p>
                )}
              </div>

              <div className="form-footer">
                <span>
                  {readOnly
                    ? `Locked as ${quotation.status}. Create a revision to change pricing.`
                    : dirty
                      ? "Unsaved changes"
                      : "Saved in Laravel"}
                </span>
                {!readOnly && (
                  <Button type="submit" variant="secondary" disabled={busy}>
                    <Icon name="check" size={16} />
                    {busy ? "Saving…" : "Save draft"}
                  </Button>
                )}
              </div>
            </form>
          </Card>

          {quotation.status === "Accepted" && (
            <div className="inline-tip">
              <Icon name="check" size={20} />
              Customer accepted this quotation
              {quotation.accepted_at
                ? ` on ${new Date(quotation.accepted_at).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}`
                : ""}
              .
              {quotation.order && (
                <>
                  {" "}
                  <Link
                    href={`/orders/${quotation.order.id}`}
                    className="text-link"
                  >
                    Open order {quotation.order.reference} ({quotation.order.payment_status})
                    <Icon name="arrow" size={16} />
                  </Link>
                </>
              )}
            </div>
          )}
        </div>

        <aside className="detail-aside">
          <Card
            title="The numbers, clearly"
            subtitle="Internal quotation breakdown"
          >
            <dl className="price-breakdown">
              <div>
                <dt>Base seafood cost</dt>
                <dd>{money(preview.seafood_cost_centavos)}</dd>
              </div>
              <div>
                <dt>Handling & packing</dt>
                <dd>{money(preview.handling_centavos)}</dd>
              </div>
              <div>
                <dt>
                  Markup <small>{form.markup_percent || 0}% of cost + handling</small>
                </dt>
                <dd>{money(preview.markup_centavos)}</dd>
              </div>
              <div className="price-divider">
                <dt>Selling subtotal</dt>
                <dd>{money(preview.subtotal_centavos)}</dd>
              </div>
              <div>
                <dt>Delivery</dt>
                <dd>{money(preview.delivery_centavos)}</dd>
              </div>
            </dl>
            <div className="grand-total">
              <span>Customer total (Full QR Ph)</span>
              <strong>{money(preview.total_centavos)}</strong>
            </div>
          </Card>

          {quotation.rfq && (
            <Card title="Linked request">
              <dl className="detail-lines">
                <div>
                  <dt>Request</dt>
                  <dd>
                    <Link
                      className="text-link"
                      href={`/rfqs/${quotation.rfq.id}`}
                    >
                      {quotation.rfq.reference}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt>Customer</dt>
                  <dd>{quotation.rfq.customer_name}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{quotation.rfq.email}</dd>
                </div>
                <div>
                  <dt>Deliver to</dt>
                  <dd>{quotation.rfq.location}</dd>
                </div>
                <div>
                  <dt>Requested date</dt>
                  <dd>
                    {quotation.rfq.requested_delivery_date
                      ? shortDate(quotation.rfq.requested_delivery_date)
                      : "Not specified"}
                  </dd>
                </div>
              </dl>
            </Card>
          )}
        </aside>
      </div>

      {modal === "preview" && (
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
                <strong>{quotation.rfq?.customer_name}</strong>
                <small>{quotation.rfq?.location}</small>
              </div>
              <div>
                <span>QUOTATION</span>
                <strong>
                  {quotation.reference} (v{quotation.version})
                </strong>
                <small>
                  Valid for{" "}
                  {formatValidityHours(Number(form.validity_hours) || 48)}
                </small>
              </div>
            </div>
            <DataTable headers={["Item", "Quantity", "Amount"]}>
              {form.items.map((item, index) => (
                <tr key={item.id}>
                  <td>
                    {item.product_name}
                    {item.specs && <small>{item.specs}</small>}
                  </td>
                  <td>
                    {item.quantity} {item.unit}
                  </td>
                  <td>
                    {item.is_available
                      ? money(preview.items[index]?.line_selling_centavos ?? 0)
                      : "Unavailable"}
                  </td>
                </tr>
              ))}
            </DataTable>
            <dl className="preview-totals">
              <div>
                <dt>Subtotal</dt>
                <dd>{money(preview.subtotal_centavos)}</dd>
              </div>
              <div>
                <dt>Delivery</dt>
                <dd>{money(preview.delivery_centavos)}</dd>
              </div>
              <div>
                <dt>Total due (Full payment via QR Ph)</dt>
                <dd>{money(preview.total_centavos)}</dd>
              </div>
            </dl>
            <div className="preview-terms">
              <strong>Terms & conditions</strong>
              <p>{form.terms}</p>
            </div>
            <p className="preview-demo-label">
              Customer view only · Base costs, handling, and markup are excluded
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
        <Dialog
          title="Send quotation to customer?"
          onClose={() => !busy && setModal(null)}
        >
          <div className="dialog-body">
            <span className="dialog-illustration">
              <Icon name="mail" size={28} />
            </span>
            <p>
              This locks <strong>{quotation.reference}</strong> (
              <strong>{money(preview.total_centavos)}</strong>) and emails a
              private link valid for{" "}
              <strong>
                {formatValidityHours(Number(form.validity_hours) || 48)}
              </strong>{" "}
              to <strong>{quotation.rfq?.email}</strong>.
            </p>
            <div className="soft-note">
              Any earlier sent quotation for this request will be superseded so
              only this version can be accepted.
            </div>
          </div>
          <div className="dialog-footer">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => setModal(null)}
            >
              Keep editing
            </Button>
            <Button disabled={busy} onClick={() => void confirmSend()}>
              {busy ? "Sending email…" : "Send quotation"}
              <Icon name="arrow" size={16} />
            </Button>
          </div>
        </Dialog>
      )}

      {modal === "cancel" && (
        <Dialog
          title="Withdraw this quotation?"
          onClose={() => !busy && setModal(null)}
        >
          <div className="dialog-body">
            <p>
              Withdrawing <strong>{quotation.reference}</strong> immediately
              prevents the customer from accepting it via their email link.
            </p>
            <Field label="Internal reason (optional)">
              <input
                type="text"
                maxLength={500}
                placeholder="e.g. Morning catch sold out or pricing correction"
                value={cancelReason}
                disabled={busy}
                onChange={(event) => setCancelReason(event.target.value)}
              />
            </Field>
          </div>
          <div className="dialog-footer">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => setModal(null)}
            >
              Keep active
            </Button>
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => void confirmCancel()}
            >
              {busy ? "Withdrawing…" : "Withdraw quotation"}
            </Button>
          </div>
        </Dialog>
      )}

      {modal === "discard" && (
        <Dialog
          title="Discard this draft?"
          onClose={() => !busy && setModal(null)}
        >
          <div className="dialog-body">
            <p>
              This permanently removes unsent draft{" "}
              <strong>{quotation.reference}</strong>. Your customer request will
              stay intact.
            </p>
          </div>
          <div className="dialog-footer">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => setModal(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => void confirmDiscard()}
            >
              {busy ? "Discarding…" : "Discard draft"}
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
}

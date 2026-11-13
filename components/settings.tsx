"use client";

import { type FormEvent, useState } from "react";
import { initialData } from "@/lib/data";
import { useDemo } from "./demo-provider";
import { Badge, Button, Card, Dialog, Field, PageHeader } from "./ui";
import { Icon } from "./ui/icon";

export function Settings() {
  const { data, update, notify } = useDemo();
  const [error, setError] = useState("");
  const [showReset, setShowReset] = useState(false);
  const settings = data.settings;

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = {
      business: String(form.get("business") ?? "").trim(),
      email: String(form.get("email") ?? "").trim(),
      phone: String(form.get("phone") ?? "").trim(),
      address: String(form.get("address") ?? "").trim(),
      validity: Number(form.get("validity")),
      deposit: Number(form.get("deposit")),
    };

    if (
      !next.business ||
      !next.email ||
      !next.address ||
      !Number.isInteger(next.validity) ||
      next.validity < 1 ||
      next.validity > 30 ||
      !Number.isFinite(next.deposit) ||
      next.deposit < 0 ||
      next.deposit > 100
    ) {
      setError(
        "Check your business details, quote validity and deposit percentage.",
      );
      return;
    }

    update((current) => ({ ...current, settings: next }));
    setError("");
    notify("Workspace settings saved in this browser’s demo.");
  }

  return (
    <>
      <PageHeader
        eyebrow="MAKE IT YOUR OWN"
        title="Workspace settings"
        description="The little details that keep your island business moving."
      />
      <div className="settings-layout">
        <form
          key={JSON.stringify(settings)}
          className="settings-form"
          onSubmit={save}
        >
          <Card
            title="Business details"
            subtitle="The name and contact details used in your demo workspace"
          >
            <div className="form-grid">
              <Field label="Business name">
                <input
                  aria-label="Business name"
                  name="business"
                  defaultValue={settings.business}
                  required
                  maxLength={100}
                  autoComplete="organization"
                />
              </Field>
              <Field label="Contact email">
                <input
                  aria-label="Contact email"
                  name="email"
                  type="email"
                  defaultValue={settings.email}
                  required
                  maxLength={150}
                  autoComplete="email"
                />
              </Field>
              <Field label="Contact number">
                <input
                  aria-label="Contact number"
                  name="phone"
                  type="tel"
                  defaultValue={settings.phone}
                  pattern="[+0-9() .-]{7,25}"
                  autoComplete="tel"
                />
              </Field>
              <Field label="Business location">
                <input
                  aria-label="Business location"
                  name="address"
                  defaultValue={settings.address}
                  required
                  maxLength={200}
                  autoComplete="street-address"
                />
              </Field>
            </div>
          </Card>
          <Card
            title="Quotation defaults"
            subtitle="A starting point for new quotations. Existing quotes stay as agreed."
          >
            <div className="form-grid">
              <Field
                label="Quotation validity (days)"
                hint="Confirm the supplier can hold the offer for this period."
              >
                <input
                  aria-label="Quotation validity in days"
                  name="validity"
                  type="number"
                  min={1}
                  max={30}
                  step={1}
                  required
                  defaultValue={settings.validity}
                />
              </Field>
              <Field
                label="Deposit percentage"
                hint="You can adjust payment terms on each new quotation."
              >
                <input
                  aria-label="Default deposit percentage"
                  name="deposit"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  required
                  defaultValue={settings.deposit}
                />
              </Field>
            </div>
            <div className="soft-note">
              Prices and availability are confirmed after sourcing. Match each
              quote’s validity to the supplier’s actual reservation window.
            </div>
          </Card>
          {error && <p role="alert">{error}</p>}
          <div className="form-footer">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                update((current) => ({
                  ...current,
                  settings: { ...initialData.settings },
                }));
                setError("");
                notify("Demo settings restored to their defaults.");
              }}
            >
              Restore demo defaults
            </Button>
            <Button type="submit">
              <Icon name="check" size={17} />
              Save changes
            </Button>
          </div>
        </form>
        <aside className="detail-aside">
          <Card
            title="Your connections"
            subtitle="A preview of what comes next"
          >
            <dl className="detail-lines">
              <div>
                <dt>Payment provider</dt>
                <dd>PayMongo QR Ph</dd>
              </div>
              <div>
                <dt>Payment environment</dt>
                <dd>
                  <Badge>Demo only</Badge>
                </dd>
              </div>
              <div>
                <dt>Customer notifications</dt>
                <dd>Preview only · no messages sent</dd>
              </div>
              <div>
                <dt>Workspace storage</dt>
                <dd>This browser</dd>
              </div>
            </dl>
          </Card>
          <div className="aside-tip">
            <Icon name="leaf" size={24} />
            <h3>A personal touch, at every step.</h3>
            <p>
              Keep customer-facing details clear and payment terms consistent.
              Final supplier offers are always checked before you send a quote.
            </p>
          </div>
          <Card
            title="A fresh demo start"
            subtitle="Replay the sample customer journey"
          >
            <p className="reset-description">
              Restore all browser-local sample requests, quotations, orders,
              products, suppliers and settings. Your edits will be cleared.
              You’ll stay signed into this demo.
            </p>
            <Button variant="secondary" onClick={() => setShowReset(true)}>
              Reset demo workspace
            </Button>
          </Card>
        </aside>
      </div>
      {showReset && (
        <Dialog
          title="Reset the demo workspace?"
          onClose={() => setShowReset(false)}
        >
          <div className="dialog-body">
            <p>
              This clears every saved demo edit in this browser and restores the
              original sample records. Your sign-in stays active.
            </p>
          </div>
          <div className="dialog-footer">
            <Button variant="secondary" onClick={() => setShowReset(false)}>
              Keep my edits
            </Button>
            <Button
              onClick={() => {
                update(() => structuredClone(initialData));
                setShowReset(false);
                setError("");
                notify(
                  "Demo workspace reset. The original sample records are ready to explore.",
                );
              }}
            >
              Reset sample records
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
}

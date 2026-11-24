"use client";

import { type FormEvent, useState } from "react";
import { useWorkspace } from "./workspace-provider";
import { Badge, Button, Card, Field, PageHeader } from "./ui";
import { Icon } from "./ui/icon";

export function Settings() {
  const { settings, updateSettings, resetSettings, notify } = useWorkspace();
  const [error, setError] = useState("");

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = {
      business: String(form.get("business") ?? "").trim(),
      email: String(form.get("email") ?? "").trim(),
      phone: String(form.get("phone") ?? "").trim(),
      address: String(form.get("address") ?? "").trim(),
      validity: Number(form.get("validity")),
    };

    if (
      !next.business ||
      !next.email ||
      !next.address ||
      !Number.isInteger(next.validity) ||
      next.validity < 1 ||
      next.validity > 30
    ) {
      setError("Check your business details and quote validity.");
      return;
    }

    updateSettings(next);
    setError("");
    notify("Workspace settings saved.");
  }

  return (
    <>
      <PageHeader
        eyebrow="WORKSPACE PREFERENCES"
        title="Workspace settings"
        description="Default business details and quotation validity window."
      />
      <div className="settings-layout">
        <form
          key={JSON.stringify(settings)}
          className="settings-form"
          onSubmit={save}
        >
          <Card
            title="Business details"
            subtitle="Reference contact details for your IslaSource workspace"
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
            title="Quotation & payment rules"
            subtitle="Starting values when preparing a new quotation draft. Sent quotes keep their own terms."
          >
            <div className="form-grid">
              <Field
                label="Quotation validity (days)"
                hint="Default is 2 days (48 hours). You can customize per quotation."
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
                label="Payment policy"
                hint="All accepted quotations require 100% upfront payment via QR Ph before sourcing."
              >
                <input
                  aria-label="Payment policy"
                  type="text"
                  readOnly
                  value="100% Full Payment (PayMongo QR Ph)"
                />
              </Field>
            </div>
            <div className="soft-note">
              Prices and availability are confirmed after checking supply. Match
              each quotation’s validity to your actual sourcing window.
            </div>
          </Card>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="form-footer">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                resetSettings();
                setError("");
                notify("Default quotation settings restored.");
              }}
            >
              Restore defaults
            </Button>
            <Button type="submit">
              <Icon name="check" size={17} />
              Save changes
            </Button>
          </div>
        </form>
        <aside className="detail-aside">
          <Card
            title="Workspace connections"
            subtitle="Active services backing this admin"
          >
            <dl className="detail-lines">
              <div>
                <dt>Catalog, RFQs, quotes & orders</dt>
                <dd>
                  <Badge>Live API</Badge>
                </dd>
              </div>
              <div>
                <dt>Quotation & order emails</dt>
                <dd>Laravel Mail (Gmail SMTP)</dd>
              </div>
              <div>
                <dt>Payment provider</dt>
                <dd>
                  <Badge>PayMongo QR Ph</Badge>
                </dd>
              </div>
              <div>
                <dt>Default preferences</dt>
                <dd>Saved in this browser</dd>
              </div>
            </dl>
          </Card>
          <div className="aside-tip">
            <Icon name="leaf" size={24} />
            <h3>Full payment, zero inventory risk.</h3>
            <p>
              Customers pay 100% via PayMongo QR Ph after accepting a quotation,
              so you only buy from island suppliers once payment is verified.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}

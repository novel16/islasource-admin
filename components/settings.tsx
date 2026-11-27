"use client";

import { type FormEvent, useState } from "react";
import { ApiError, apiEndpoints } from "@/lib/api";
import {
  createSecurityClient,
  type AdminSessionToken,
} from "@/lib/auth-session";
import { useAuth } from "./auth-provider";
import { useWorkspace } from "./workspace-provider";
import { Badge, Button, Card, Field, PageHeader } from "./ui";
import { Icon } from "./ui/icon";
import { useApiResource } from "./use-api-resource";

function formatSessionDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function Settings() {
  const { user, request, logout } = useAuth();
  const { settings, updateSettings, resetSettings, notify } = useWorkspace();
  const tokensResource = useApiResource<{ data: AdminSessionToken[] }>(
    apiEndpoints.authTokens,
  );

  const [error, setError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [revokingId, setRevokingId] = useState<number | "all" | null>(null);
  const [sessionError, setSessionError] = useState("");

  const security = createSecurityClient(request);
  const sessions = tokensResource.data?.data ?? [];

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

  async function submitPasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (passwordSaving) return;
    if (newPassword !== confirmPassword) {
      setPasswordError("New password confirmation does not match.");
      return;
    }
    setPasswordSaving(true);
    setPasswordError("");
    try {
      await security.changePassword({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      tokensResource.retry();
      notify("Password updated. Other active sessions were signed out.");
    } catch (failure) {
      setPasswordError(
        failure instanceof ApiError
          ? Object.values(failure.errors).flat()[0] || failure.message
          : "We couldn’t update your password. Please try again.",
      );
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handleRevoke(tokenId: number) {
    if (revokingId !== null) return;
    setRevokingId(tokenId);
    setSessionError("");
    try {
      await security.revokeToken(tokenId);
      tokensResource.retry();
      notify("Device session revoked.");
    } catch (failure) {
      setSessionError(
        failure instanceof ApiError
          ? failure.message
          : "We couldn’t revoke this session.",
      );
    } finally {
      setRevokingId(null);
    }
  }

  async function handleLogoutAll() {
    if (revokingId !== null) return;
    setRevokingId("all");
    setSessionError("");
    try {
      await security.logoutAll();
      await logout();
    } catch (failure) {
      setRevokingId(null);
      setSessionError(
        failure instanceof ApiError
          ? failure.message
          : "We couldn’t sign out all devices right now.",
      );
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="WORKSPACE & ACCOUNT SECURITY"
        title="Workspace settings"
        description="Manage your business preferences, admin password, and signed-in devices."
      />
      <div className="settings-layout">
        <div className="detail-main">
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
                Prices and availability are confirmed after checking supply.
                Match each quotation’s validity to your actual sourcing window.
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
                Save preferences
              </Button>
            </div>
          </form>

          <Card
            title="Change admin password"
            subtitle={
              user?.email
                ? `Signed in as ${user.email} · Updating signs out other devices`
                : "Updating your password signs out other active devices"
            }
          >
            <form onSubmit={(event) => void submitPasswordChange(event)}>
              <div className="form-grid">
                <Field label="Current password" className="full">
                  <input
                    type="password"
                    required
                    maxLength={1024}
                    autoComplete="current-password"
                    disabled={passwordSaving}
                    value={currentPassword}
                    onChange={(event) => {
                      setCurrentPassword(event.target.value);
                      if (passwordError) setPasswordError("");
                    }}
                  />
                </Field>
                <Field label="New password" hint="At least 8 characters.">
                  <input
                    type="password"
                    required
                    minLength={8}
                    maxLength={1024}
                    autoComplete="new-password"
                    disabled={passwordSaving}
                    value={newPassword}
                    onChange={(event) => {
                      setNewPassword(event.target.value);
                      if (passwordError) setPasswordError("");
                    }}
                  />
                </Field>
                <Field label="Confirm new password">
                  <input
                    type="password"
                    required
                    minLength={8}
                    maxLength={1024}
                    autoComplete="new-password"
                    disabled={passwordSaving}
                    value={confirmPassword}
                    onChange={(event) => {
                      setConfirmPassword(event.target.value);
                      if (passwordError) setPasswordError("");
                    }}
                  />
                </Field>
              </div>
              {passwordError && (
                <p
                  className="form-error"
                  role="alert"
                  style={{ margin: "0 25px 15px" }}
                >
                  {passwordError}
                </p>
              )}
              <div className="form-footer">
                <span>Protected by Sanctum bearer authentication</span>
                <Button type="submit" disabled={passwordSaving}>
                  <Icon name="check" size={16} />
                  {passwordSaving ? "Updating…" : "Update password"}
                </Button>
              </div>
            </form>
          </Card>

          <Card
            title="Active sessions"
            subtitle="Devices currently signed in to your IslaSource admin account"
            action={
              sessions.length > 0 ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={revokingId !== null}
                  onClick={() => void handleLogoutAll()}
                >
                  {revokingId === "all"
                    ? "Signing out…"
                    : "Sign out all devices"}
                </Button>
              ) : undefined
            }
          >
            {sessionError && (
              <p
                className="form-error"
                role="alert"
                style={{ margin: "0 25px 15px" }}
              >
                {sessionError}
              </p>
            )}
            {tokensResource.loading ? (
              <p className="loading-text">Loading active sessions…</p>
            ) : tokensResource.error ? (
              <div className="notes-list">
                <p className="muted">{tokensResource.error.message}</p>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={tokensResource.retry}
                >
                  Try again
                </Button>
              </div>
            ) : (
              <div className="message-thread">
                {sessions.map((token) => (
                  <div
                    key={token.id}
                    className={`message-item ${token.is_current ? "from-admin" : ""}`}
                  >
                    <div className="message-meta">
                      <strong>
                        {token.device_name}{" "}
                        {token.is_current && <Badge>Active</Badge>}
                      </strong>
                      {!token.is_current && (
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={revokingId !== null}
                          onClick={() => void handleRevoke(token.id)}
                        >
                          {revokingId === token.id ? "Revoking…" : "Revoke"}
                        </Button>
                      )}
                    </div>
                    <p>
                      Signed in {formatSessionDate(token.created_at)} · Expires{" "}
                      {formatSessionDate(token.expires_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

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

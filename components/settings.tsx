"use client";

import { type ChangeEvent, type FormEvent, useState } from "react";
import { ApiError, apiEndpoints } from "@/lib/api";
import {
  createSecurityClient,
  type AdminSessionToken,
} from "@/lib/auth-session";
import { createProductsClient } from "@/lib/products";
import {
  builtInSiteImages,
  createSettingsClient,
  siteAssetSrc,
  type AdminSiteSettings,
} from "@/lib/settings";
import { useAuth } from "./auth-provider";
import { useWorkspace } from "./workspace-provider";
import { Badge, Button, Card, Field, PageHeader } from "./ui";
import { Icon } from "./ui/icon";
import { useApiResource } from "./use-api-resource";

type SettingsTab = "pricing" | "homepage" | "terms" | "security";

type FormDraft = AdminSiteSettings & {
  handling_pesos: string;
  cebu_delivery_pesos: string;
  story_paragraphs_text: string;
};

function toFormDraft(source: AdminSiteSettings): FormDraft {
  return {
    ...source,
    handling_pesos: centavosToPesosInput(source.default_handling_centavos),
    cebu_delivery_pesos: centavosToPesosInput(
      source.default_cebu_delivery_centavos,
    ),
    story_paragraphs_text: source.homepage.story_paragraphs.join("\n\n"),
  };
}

function formatSessionDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function centavosToPesosInput(centavos: number): string {
  return (centavos / 100).toFixed(2);
}

function pesosInputToCentavos(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100);
}

function linesFromText(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function Settings() {
  const { user, request, logout } = useAuth();
  const { notify } = useWorkspace();
  const settingsResource = useApiResource<{ data: AdminSiteSettings }>(
    apiEndpoints.settings,
  );
  const tokensResource = useApiResource<{ data: AdminSessionToken[] }>(
    apiEndpoints.authTokens,
  );

  const [tab, setTab] = useState<SettingsTab>("pricing");
  const [editedDraft, setEditedDraft] = useState<FormDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState<"hero" | "story" | null>(
    null,
  );
  const [error, setError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [revokingId, setRevokingId] = useState<number | "all" | null>(null);
  const [sessionError, setSessionError] = useState("");

  const settingsClient = createSettingsClient(request);
  const productsClient = createProductsClient(request);
  const security = createSecurityClient(request);
  const sessions = tokensResource.data?.data ?? [];
  const draft: FormDraft | null =
    editedDraft ??
    (settingsResource.data?.data
      ? toFormDraft(settingsResource.data.data)
      : null);

  async function handleImageUpload(
    slot: "hero" | "story",
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !draft || uploadingSlot !== null) return;

    setUploadingSlot(slot);
    setError("");
    try {
      const uploadedPath = await productsClient.upload(file);
      setEditedDraft({
        ...draft,
        homepage: {
          ...draft.homepage,
          [slot === "hero" ? "hero_image" : "story_image"]: uploadedPath,
        },
      });
      notify(
        slot === "hero"
          ? "Hero photo uploaded. Click Save settings to publish."
          : "Story photo uploaded. Click Save settings to publish.",
      );
    } catch (failure) {
      setError(
        failure instanceof ApiError
          ? Object.values(failure.errors).flat()[0] || failure.message
          : "We couldn’t upload that photo. Choose a JPG, PNG, or WebP up to 5 MB.",
      );
    } finally {
      setUploadingSlot(null);
    }
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || saving || resetting) return;

    const storyParagraphs = draft.story_paragraphs_text
      .split(/\n\s*\n|\r\n\s*\r\n/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (!storyParagraphs.length) {
      setError(
        "Enter at least one paragraph for the About / Island story section.",
      );
      return;
    }

    const {
      handling_pesos: handlingPesos,
      cebu_delivery_pesos: cebuDeliveryPesos,
      story_paragraphs_text: _storyText,
      ...rest
    } = draft;
    void _storyText;

    const payload: AdminSiteSettings = {
      ...rest,
      default_handling_centavos: pesosInputToCentavos(handlingPesos),
      default_cebu_delivery_centavos: pesosInputToCentavos(cebuDeliveryPesos),
      homepage: {
        ...draft.homepage,
        story_paragraphs: storyParagraphs.slice(0, 5),
      },
    };

    setSaving(true);
    setError("");
    try {
      const updated = await settingsClient.update(payload);
      setEditedDraft(toFormDraft(updated));
      notify("Settings saved to database.");
    } catch (failure) {
      setError(
        failure instanceof ApiError
          ? Object.values(failure.errors).flat()[0] || failure.message
          : "We couldn’t save your settings. Please check the fields and try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleResetDefaults() {
    if (saving || resetting) return;
    setResetting(true);
    setError("");
    try {
      const restored = await settingsClient.reset();
      setEditedDraft(toFormDraft(restored));
      notify("Default database settings restored.");
    } catch (failure) {
      setError(
        failure instanceof ApiError
          ? failure.message
          : "We couldn’t restore default settings right now.",
      );
    } finally {
      setResetting(false);
    }
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
        eyebrow="DATABASE CONFIGURATION & SECURITY"
        title="Workspace & storefront settings"
        description="Manage quotation commission, handling & Cebu delivery defaults, minimum weights, homepage content & photos, policy sections, and account security."
      />

      <div className="settings-tabs" role="tablist" aria-label="Settings sections">
        {(
          [
            ["pricing", "Pricing & Business"],
            ["homepage", "Homepage & Photos"],
            ["terms", "Terms & Policies"],
            ["security", "Account Security"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`settings-tab ${tab === key ? "active" : ""}`}
            onClick={() => {
              setTab(key);
              setError("");
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="settings-layout">
        <div className="detail-main">
          {tab === "security" ? (
            <div className="settings-form">
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
                          Signed in {formatSessionDate(token.created_at)} ·
                          Expires {formatSessionDate(token.expires_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          ) : settingsResource.loading && !draft ? (
            <Card title="Loading database settings">
              <p className="loading-text">Fetching workspace configuration…</p>
            </Card>
          ) : settingsResource.error && !draft ? (
            <Card title="Couldn’t load settings">
              <div className="catalog-feedback">
                <p>{settingsResource.error.message}</p>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={settingsResource.retry}
                >
                  Try again
                </Button>
              </div>
            </Card>
          ) : draft ? (
            <form className="settings-form" onSubmit={(e) => void saveSettings(e)}>
              {tab === "pricing" && (
                <>
                  <Card
                    title="Quotation pricing defaults (Private)"
                    subtitle="Applied automatically to newly created Draft Quotations. Existing or sent quotes keep their own figures, and these rates are never exposed publicly."
                  >
                    <div className="form-grid">
                      <Field
                        label="Default commission / markup (%)"
                        hint="Net profit percentage added on seafood + handling."
                      >
                        <input
                          type="number"
                          min={0}
                          max={200}
                          step="0.01"
                          required
                          value={draft.default_markup_percent}
                          onChange={(e) =>
                            setEditedDraft({
                              ...draft,
                              default_markup_percent: e.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field
                        label="Default handling / packing fee (PHP)"
                        hint="Starting styrofoam, ice, and packing charge."
                      >
                        <input
                          type="number"
                          min={0}
                          max={500000}
                          step="0.01"
                          required
                          value={draft.handling_pesos}
                          onChange={(e) =>
                            setEditedDraft({
                              ...draft,
                              handling_pesos: e.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field
                        label="Default Mainland Cebu delivery fee (PHP)"
                        hint="Bantayan Island RFQs automatically start at ₱0.00 (Free)."
                      >
                        <input
                          type="number"
                          min={0}
                          max={500000}
                          step="0.01"
                          required
                          value={draft.cebu_delivery_pesos}
                          onChange={(e) =>
                            setEditedDraft({
                              ...draft,
                              cebu_delivery_pesos: e.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field
                        label="Default quotation validity (hours)"
                        hint="48 hours = 2 days. Adjustable per quotation."
                      >
                        <input
                          type="number"
                          min={1}
                          max={720}
                          step={1}
                          required
                          value={draft.default_validity_hours}
                          onChange={(e) =>
                            setEditedDraft({
                              ...draft,
                              default_validity_hours: Number(e.target.value),
                            })
                          }
                        />
                      </Field>
                      <Field
                        label="Default quotation terms note"
                        className="full"
                        hint="Pre-filled at the bottom of new quotation drafts."
                      >
                        <textarea
                          rows={3}
                          required
                          maxLength={1000}
                          value={draft.default_quotation_terms}
                          onChange={(e) =>
                            setEditedDraft({
                              ...draft,
                              default_quotation_terms: e.target.value,
                            })
                          }
                        />
                      </Field>
                    </div>
                  </Card>

                  <Card
                    title="Delivery minimums & business contact (Public)"
                    subtitle="Displayed on /request-quote, storefront footer, and customer communications."
                  >
                    <div className="form-grid">
                      <Field
                        label="Bantayan Island minimum order (kg)"
                        hint="Free direct delivery within Bantayan, Santa Fe & Madridejos."
                      >
                        <input
                          type="number"
                          min={0.5}
                          max={500}
                          step="0.5"
                          required
                          value={draft.island_min_kg}
                          onChange={(e) =>
                            setEditedDraft({
                              ...draft,
                              island_min_kg: Number(e.target.value),
                            })
                          }
                        />
                      </Field>
                      <Field
                        label="Mainland Cebu minimum order (kg)"
                        hint="Ceres North Bus Terminal & island trucking pickup."
                      >
                        <input
                          type="number"
                          min={0.5}
                          max={500}
                          step="0.5"
                          required
                          value={draft.cebu_min_kg}
                          onChange={(e) =>
                            setEditedDraft({
                              ...draft,
                              cebu_min_kg: Number(e.target.value),
                            })
                          }
                        />
                      </Field>
                      <Field label="Business name">
                        <input
                          required
                          maxLength={100}
                          value={draft.business_name}
                          onChange={(e) =>
                            setEditedDraft({
                              ...draft,
                              business_name: e.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field label="Contact email">
                        <input
                          type="email"
                          required
                          maxLength={150}
                          value={draft.contact_email}
                          onChange={(e) =>
                            setEditedDraft({
                              ...draft,
                              contact_email: e.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field label="Contact mobile / phone">
                        <input
                          type="tel"
                          maxLength={30}
                          placeholder="+63 9XX XXX XXXX"
                          value={draft.contact_phone}
                          onChange={(e) =>
                            setEditedDraft({
                              ...draft,
                              contact_phone: e.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field label="Business base location">
                        <input
                          required
                          maxLength={200}
                          value={draft.business_address}
                          onChange={(e) =>
                            setEditedDraft({
                              ...draft,
                              business_address: e.target.value,
                            })
                          }
                        />
                      </Field>
                    </div>
                  </Card>
                </>
              )}

              {tab === "homepage" && (
                <>
                  <Card
                    title="Island advisory banner"
                    subtitle="Optional top notice on the homepage and quote page (useful for rough-sea delays, holidays, or fresh catch schedules)."
                  >
                    <label
                      className="checkbox-label"
                      style={{ marginTop: 18, marginBottom: 14 }}
                    >
                      <input
                        type="checkbox"
                        checked={draft.homepage.advisory_enabled}
                        onChange={(e) =>
                          setEditedDraft({
                            ...draft,
                            homepage: {
                              ...draft.homepage,
                              advisory_enabled: e.target.checked,
                            },
                          })
                        }
                      />
                      <span>
                        <strong>Show advisory banner on storefront</strong>
                        <small>
                          Turn off anytime once normal fishing and ferry trips
                          resume.
                        </small>
                      </span>
                    </label>
                    <div className="form-grid">
                      <Field
                        label="Advisory message"
                        className="full"
                        hint="Up to 300 characters."
                      >
                        <input
                          maxLength={300}
                          placeholder="e.g. Rough seas notice: Fresh catch dispatches resume tomorrow morning via Ceres Bus."
                          value={draft.homepage.advisory_text}
                          onChange={(e) =>
                            setEditedDraft({
                              ...draft,
                              homepage: {
                                ...draft.homepage,
                                advisory_text: e.target.value,
                              },
                            })
                          }
                        />
                      </Field>
                    </div>
                  </Card>

                  <Card
                    title="Homepage hero copy & photo"
                    subtitle="Main banner text and featured hero photograph on the storefront homepage."
                  >
                    <div className="product-sharing-image">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={siteAssetSrc(draft.homepage.hero_image)}
                        alt={draft.homepage.hero_image_alt}
                      />
                    </div>
                    <div className="product-upload">
                      <label style={{ display: "block", fontSize: 11, marginBottom: 8 }}>
                        <strong>
                          {uploadingSlot === "hero"
                            ? "Uploading hero photo…"
                            : "Upload custom hero photo (JPG, PNG, or WebP up to 5 MB)"}
                        </strong>
                      </label>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={uploadingSlot !== null}
                        onChange={(e) => void handleImageUpload("hero", e)}
                      />
                    </div>
                    <div className="image-options">
                      {builtInSiteImages.map((img) => (
                        <button
                          key={img.src}
                          type="button"
                          title={img.label}
                          className={
                            draft.homepage.hero_image === img.src
                              ? "selected"
                              : ""
                          }
                          onClick={() =>
                            setEditedDraft({
                              ...draft,
                              homepage: {
                                ...draft.homepage,
                                hero_image: img.src,
                              },
                            })
                          }
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.src} alt={img.label} width={52} height={48} />
                        </button>
                      ))}
                    </div>
                    <div className="form-grid">
                      <Field label="Hero eyebrow">
                        <input
                          required
                          maxLength={80}
                          value={draft.homepage.hero_eyebrow}
                          onChange={(e) =>
                            setEditedDraft({
                              ...draft,
                              homepage: {
                                ...draft.homepage,
                                hero_eyebrow: e.target.value,
                              },
                            })
                          }
                        />
                      </Field>
                      <Field label="Hero photo caption">
                        <input
                          maxLength={140}
                          value={draft.homepage.hero_caption}
                          onChange={(e) =>
                            setEditedDraft({
                              ...draft,
                              homepage: {
                                ...draft.homepage,
                                hero_caption: e.target.value,
                              },
                            })
                          }
                        />
                      </Field>
                      <Field
                        label="Hero headline"
                        className="full"
                        hint="Use Enter / new lines to control line breaks."
                      >
                        <textarea
                          rows={3}
                          required
                          maxLength={160}
                          value={draft.homepage.hero_headline}
                          onChange={(e) =>
                            setEditedDraft({
                              ...draft,
                              homepage: {
                                ...draft.homepage,
                                hero_headline: e.target.value,
                              },
                            })
                          }
                        />
                      </Field>
                      <Field label="Hero description" className="full">
                        <textarea
                          rows={3}
                          required
                          maxLength={500}
                          value={draft.homepage.hero_subtext}
                          onChange={(e) =>
                            setEditedDraft({
                              ...draft,
                              homepage: {
                                ...draft.homepage,
                                hero_subtext: e.target.value,
                              },
                            })
                          }
                        />
                      </Field>
                      <Field label="Hero photo alt text" className="full">
                        <input
                          required
                          maxLength={160}
                          value={draft.homepage.hero_image_alt}
                          onChange={(e) =>
                            setEditedDraft({
                              ...draft,
                              homepage: {
                                ...draft.homepage,
                                hero_image_alt: e.target.value,
                              },
                            })
                          }
                        />
                      </Field>
                    </div>
                  </Card>

                  <Card
                    title="About / Island story section & photo"
                    subtitle="Bottom story section introducing IslaSource Seafoods on the homepage."
                  >
                    <div className="product-sharing-image">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={siteAssetSrc(draft.homepage.story_image)}
                        alt={draft.homepage.story_image_alt}
                      />
                    </div>
                    <div className="product-upload">
                      <label style={{ display: "block", fontSize: 11, marginBottom: 8 }}>
                        <strong>
                          {uploadingSlot === "story"
                            ? "Uploading story photo…"
                            : "Upload custom story photo (JPG, PNG, or WebP up to 5 MB)"}
                        </strong>
                      </label>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={uploadingSlot !== null}
                        onChange={(e) => void handleImageUpload("story", e)}
                      />
                    </div>
                    <div className="image-options">
                      {builtInSiteImages.map((img) => (
                        <button
                          key={img.src}
                          type="button"
                          title={img.label}
                          className={
                            draft.homepage.story_image === img.src
                              ? "selected"
                              : ""
                          }
                          onClick={() =>
                            setEditedDraft({
                              ...draft,
                              homepage: {
                                ...draft.homepage,
                                story_image: img.src,
                              },
                            })
                          }
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.src} alt={img.label} width={52} height={48} />
                        </button>
                      ))}
                    </div>
                    <div className="form-grid">
                      <Field label="Story heading" className="full">
                        <textarea
                          rows={2}
                          required
                          maxLength={140}
                          value={draft.homepage.story_heading}
                          onChange={(e) =>
                            setEditedDraft({
                              ...draft,
                              homepage: {
                                ...draft.homepage,
                                story_heading: e.target.value,
                              },
                            })
                          }
                        />
                      </Field>
                      <Field
                        label="Story paragraphs"
                        className="full"
                        hint="Separate paragraphs with a blank line (1 to 5 paragraphs)."
                      >
                        <textarea
                          rows={7}
                          required
                          value={draft.story_paragraphs_text}
                          onChange={(e) =>
                            setEditedDraft({
                              ...draft,
                              story_paragraphs_text: e.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field label="Story photo alt text" className="full">
                        <input
                          required
                          maxLength={160}
                          value={draft.homepage.story_image_alt}
                          onChange={(e) =>
                            setEditedDraft({
                              ...draft,
                              homepage: {
                                ...draft.homepage,
                                story_image_alt: e.target.value,
                              },
                            })
                          }
                        />
                      </Field>
                    </div>
                  </Card>
                </>
              )}

              {tab === "terms" && (
                <Card
                  title="Terms, Pickup Rules & Privacy Policy (/terms)"
                  subtitle="Edit the 6 policy sections shown on /terms. Anchor IDs (#payments-refunds, #privacy, etc.) stay locked so checkout links never break."
                >
                  <div className="policy-editor-list">
                    {draft.terms_sections.map((section, index) => (
                      <div key={section.id} className="policy-editor-item">
                        <div className="policy-editor-header">
                          <strong>
                            Section {section.number} · {section.title}
                          </strong>
                          <Badge>#{section.id}</Badge>
                        </div>
                        <div className="form-grid">
                          <Field label="Section heading" className="full">
                            <input
                              required
                              maxLength={160}
                              value={section.title}
                              onChange={(e) => {
                                const next = [...draft.terms_sections];
                                next[index] = {
                                  ...section,
                                  title: e.target.value,
                                };
                                setEditedDraft({ ...draft, terms_sections: next });
                              }}
                            />
                          </Field>
                          <Field
                            label="Paragraphs (one paragraph per line)"
                            className="full"
                          >
                            <textarea
                              rows={4}
                              required
                              value={section.paragraphs.join("\n")}
                              onChange={(e) => {
                                const next = [...draft.terms_sections];
                                next[index] = {
                                  ...section,
                                  paragraphs: linesFromText(e.target.value),
                                };
                                setEditedDraft({ ...draft, terms_sections: next });
                              }}
                            />
                          </Field>
                          <Field
                            label="Bullet points (optional · one bullet per line)"
                            className="full"
                          >
                            <textarea
                              rows={section.bullets.length ? 5 : 2}
                              value={section.bullets.join("\n")}
                              onChange={(e) => {
                                const next = [...draft.terms_sections];
                                next[index] = {
                                  ...section,
                                  bullets: linesFromText(e.target.value),
                                };
                                setEditedDraft({ ...draft, terms_sections: next });
                              }}
                            />
                          </Field>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}

              <div className="form-footer">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={saving || resetting || uploadingSlot !== null}
                  onClick={() => void handleResetDefaults()}
                >
                  {resetting ? "Restoring…" : "Restore factory defaults"}
                </Button>
                <Button
                  type="submit"
                  disabled={saving || resetting || uploadingSlot !== null}
                >
                  <Icon name="check" size={17} />
                  {saving ? "Saving…" : "Save settings to database"}
                </Button>
              </div>
            </form>
          ) : null}
        </div>

        <aside className="detail-aside">
          <Card
            title="Workspace connections"
            subtitle="Active services backing this admin"
          >
            <dl className="detail-lines">
              <div>
                <dt>Settings storage</dt>
                <dd>
                  <Badge>MySQL Database</Badge>
                </dd>
              </div>
              <div>
                <dt>Commission & cost defaults</dt>
                <dd>Admin-only (Hidden from public)</dd>
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
            </dl>
          </Card>
          <div className="aside-tip">
            <Icon name="leaf" size={24} />
            <h3>Safe historical records.</h3>
            <p>
              Updating your commission %, handling fee, or Cebu delivery fee
              only changes future quotation drafts—sent quotations and paid
              orders keep their confirmed totals.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}

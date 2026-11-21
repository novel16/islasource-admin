"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import {
  blankProduct,
  createProductsClient,
  productCategories,
  productImages,
  productPayload,
  productStatuses,
  slugFromName,
  type CatalogProduct,
  type ProductDraft,
} from "@/lib/products";
import { useAuth } from "../auth-provider";
import { useDemo } from "../demo-provider";
import { BackLink, Badge, Button, Card, Field, PageHeader } from "../ui";
import { Icon } from "../ui/icon";
import { ArchiveProductDialog } from "./archive-dialog";
import { ProductImage, ProductImageUpload } from "./product-image";

export function ProductEditor({ initial }: { initial?: CatalogProduct }) {
  const { request } = useAuth();
  const { notify } = useDemo();
  const router = useRouter();
  const [product, setProduct] = useState(initial ?? null);
  const [p, setP] = useState<ProductDraft>(() =>
    initial ? productPayload(initial) : { ...blankProduct },
  );
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [uploads, setUploads] = useState({ image: false, og_image: false });
  const [isSaved, setIsSaved] = useState(false);
  const [archive, setArchive] = useState(false);
  const busy = saving || uploads.image || uploads.og_image;

  function change(key: keyof ProductDraft, value: string | boolean) {
    setP((current) => ({
      ...current,
      [key]: value,
      ...(key === "name" &&
      !product &&
      (!current.slug || current.slug === slugFromName(current.name))
        ? { slug: slugFromName(String(value)) }
        : {}),
    }));
    setErrors((current) => ({ ...current, [key]: [] }));
    setIsSaved(false);
  }

  async function save() {
    if (busy) return;
    setSaving(true);
    setError("");
    setErrors({});
    try {
      const saved = await createProductsClient(request).save(p, product?.id);
      setProduct(saved);
      setP(productPayload(saved));
      setIsSaved(true);
      notify(
        product
          ? "Product and SEO details saved to your catalog."
          : "Product added to your catalog.",
      );
      if (!product) router.replace(`/products/${saved.id}`);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "We couldn’t save this product. Please try again.",
      );
      if (failure instanceof ApiError) setErrors(failure.errors);
    } finally {
      setSaving(false);
    }
  }

  function text(
    key: keyof ProductDraft,
    label: string,
    options: {
      required?: boolean;
      maxLength?: number;
      hint?: string;
      multiline?: boolean;
      className?: string;
      type?: string;
      min?: string;
      max?: string;
      step?: string;
      pattern?: string;
    } = {},
  ) {
    const shared = {
      "aria-label": label,
      value: String(p[key]),
      onChange: (
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => change(key, event.target.value),
      required: options.required,
      maxLength: options.maxLength,
      "aria-invalid": Boolean(errors[key]?.length),
    };
    return (
      <Field
        label={label}
        hint={errors[key]?.[0] || options.hint}
        className={`${options.className || ""} ${errors[key]?.length ? "field-invalid" : ""}`}
      >
        {options.multiline ? (
          <textarea {...shared} rows={3} />
        ) : (
          <input
            {...shared}
            type={options.type || "text"}
            min={options.min}
            max={options.max}
            step={options.step}
            pattern={options.pattern}
          />
        )}
      </Field>
    );
  }

  function select(
    key: "category" | "status" | "unit",
    label: string,
    options: readonly string[],
  ) {
    return (
      <Field
        label={label}
        hint={errors[key]?.[0]}
        className={errors[key]?.length ? "field-invalid" : ""}
      >
        <select
          aria-label={label}
          value={p[key]}
          onChange={(event) => change(key, event.target.value)}
          aria-invalid={Boolean(errors[key]?.length)}
        >
          {options.map((value) => (
            <option key={value} value={value}>
              {value === "kg"
                ? "Kilogram (kg)"
                : value === "pack"
                  ? "Pack"
                  : value === "piece"
                    ? "Piece"
                    : value}
            </option>
          ))}
        </select>
      </Field>
    );
  }

  function chooseImage(path: string) {
    setP((current) => ({
      ...current,
      image: path,
      og_image:
        !current.og_image || current.og_image === current.image
          ? path
          : current.og_image,
    }));
    setErrors((current) => ({ ...current, image: [] }));
    setIsSaved(false);
  }

  return (
    <>
      <BackLink href="/products">All products</BackLink>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
        aria-busy={busy}
      >
        <fieldset className="product-fieldset" disabled={busy}>
          <PageHeader
            eyebrow="PRODUCT EDITOR"
            title={product?.name || "A new island favorite"}
            description="Clear product details, ready for your next customer quotation."
            actions={
              <>
                <Badge>{isSaved ? "Saved" : p.status}</Badge>
                <Button type="submit">
                  <Icon name="check" size={16} />
                  {saving
                    ? "Saving…"
                    : product
                      ? "Save changes"
                      : "Add product"}
                </Button>
              </>
            }
          />
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="detail-grid">
            <div className="detail-main">
              <Card
                title="The story & the details"
                subtitle="The content your customers will read"
              >
                <div className="form-grid">
                  {text("name", "Product name", {
                    required: true,
                    className: "full",
                    maxLength: 100,
                  })}
                  {text("description", "Content description", {
                    required: true,
                    multiline: true,
                    className: "full",
                    maxLength: 20000,
                    hint: "Describe the seafood for your catalog. Keep search copy in the separate meta description.",
                  })}
                  {text("specs", "Specifications & packing", {
                    multiline: true,
                    className: "full",
                    maxLength: 5000,
                  })}
                </div>
              </Card>
              <Card
                title="Sourcing & availability"
                subtitle="Products are sourced after the customer’s quote request"
              >
                <div className="form-grid">
                  {text("min_order_quantity", "Minimum order quantity", {
                    required: true,
                    type: "number",
                    min: "0.001",
                    max: "9999999.999",
                    step: "0.001",
                    hint: `Measured in ${p.unit}. Final supply is confirmed per request.`,
                  })}
                  {text("availability_note", "Availability note", {
                    multiline: true,
                    className: "full",
                    maxLength: 500,
                    hint: "Explain sourcing and supply conditions without promising available stock.",
                  })}
                </div>
              </Card>
              <Card
                title="Search & sharing"
                subtitle="Help the right customers find their island favorites"
                className="seo-fields"
              >
                <div className="form-grid">
                  {text("slug", "URL slug", {
                    required: true,
                    className: "full",
                    maxLength: 160,
                    pattern: "[a-z0-9]+(-[a-z0-9]+)*",
                    hint: "Lowercase letters, numbers and single hyphens. Previous slugs stay reserved when changed.",
                  })}
                  {text("meta_title", "Meta title", {
                    required: true,
                    className: "full",
                    maxLength: 70,
                    hint: `${p.meta_title.length}/70 characters`,
                  })}
                  {text("meta_description", "Meta description", {
                    required: true,
                    multiline: true,
                    className: "full",
                    maxLength: 160,
                    hint: `${p.meta_description.length}/160 characters. A short description for search results.`,
                  })}
                  {text("canonical_url", "Canonical URL override", {
                    type: "url",
                    className: "full",
                    maxLength: 2048,
                    hint: "Optional absolute HTTP(S) URL. Leave blank to use the product’s normal address.",
                  })}
                  {text("og_title", "Open Graph title", {
                    className: "full",
                    maxLength: 100,
                    hint: "Optional title for social sharing.",
                  })}
                  {text("og_description", "Open Graph description", {
                    multiline: true,
                    className: "full",
                    maxLength: 200,
                  })}
                </div>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={p.indexable}
                    onChange={(event) =>
                      change("indexable", event.target.checked)
                    }
                  />
                  <span>
                    Allow this product in search results
                    <small>
                      Applies to the storefront product. The admin workspace
                      always uses noindex.
                    </small>
                  </span>
                </label>
                {product?.previous_slugs?.length ? (
                  <div className="product-slug-history">
                    <strong>Reserved previous slugs</strong>
                    <p>{product.previous_slugs.join(" · ")}</p>
                  </div>
                ) : null}
              </Card>
            </div>
            <aside className="detail-aside">
              <Card
                title="Product image"
                subtitle="Upload your photo or choose a supplied image"
              >
                <div className="product-editor-image">
                  <ProductImage
                    path={p.image}
                    alt={p.image_alt || p.name || "Selected product photograph"}
                    fill
                    sizes="(max-width: 768px) 90vw, 310px"
                  />
                </div>
                <div className="image-options">
                  {productImages.map((image) => (
                    <button
                      key={image.src}
                      type="button"
                      aria-label={`Select ${image.label} image`}
                      aria-pressed={p.image === image.src}
                      className={p.image === image.src ? "selected" : ""}
                      onClick={() => chooseImage(image.src)}
                    >
                      <ProductImage
                        path={image.src}
                        alt=""
                        width={48}
                        height={44}
                      />
                    </button>
                  ))}
                </div>
                <ProductImageUpload
                  label="Upload product image"
                  disabled={saving}
                  onChange={chooseImage}
                  onBusyChange={(value) =>
                    setUploads((current) => ({ ...current, image: value }))
                  }
                />
                <div className="product-image-alt">
                  {text("image_alt", "Image alt text", {
                    maxLength: 255,
                    hint:
                      errors.image?.[0] ||
                      "Describe the image. If blank, the product name is used.",
                  })}
                </div>
              </Card>
              <Card title="Catalog settings">
                <div className="product-settings">
                  {select("category", "Category", productCategories)}
                  {select("status", "Status", productStatuses)}
                  {select("unit", "Selling unit", ["kg", "pack", "piece"])}
                  <p className="status-explanation">
                    Publication settings are saved in your catalog. The public
                    storefront will be connected separately.
                  </p>
                </div>
              </Card>
              <Card
                title="Search result preview"
                subtitle={
                  p.indexable
                    ? "Updates as you edit"
                    : "Search indexing disabled"
                }
              >
                <div className="search-preview">
                  <div className="preview-url">
                    {p.canonical_url ||
                      `islasource.example › seafood › ${p.slug || "your-product"}`}
                  </div>
                  <h3>{p.meta_title || p.name || "Your product title"}</h3>
                  <p>
                    {p.meta_description ||
                      "Your search description will appear here."}
                  </p>
                </div>
              </Card>
              <Card title="Social sharing preview">
                <div className="product-sharing-image">
                  <ProductImage
                    path={p.og_image || p.image}
                    alt={p.image_alt || p.name || "Social sharing preview"}
                    width={310}
                    height={164}
                    sizes="310px"
                  />
                </div>
                <div className="search-preview">
                  <span className="preview-url">ISLASOURCE SEAFOODS</span>
                  <h3>
                    {p.og_title ||
                      p.meta_title ||
                      p.name ||
                      "A taste of the island"}
                  </h3>
                  <p>
                    {p.og_description ||
                      p.meta_description ||
                      "Your sharing description will appear here."}
                  </p>
                </div>
                <ProductImageUpload
                  label="Upload sharing image"
                  disabled={saving}
                  onChange={(path) => change("og_image", path)}
                  onBusyChange={(value) =>
                    setUploads((current) => ({ ...current, og_image: value }))
                  }
                />
                {errors.og_image?.length ? (
                  <p className="form-error">{errors.og_image[0]}</p>
                ) : null}
                <div className="product-sharing-actions">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => change("og_image", p.image)}
                  >
                    Use product image
                  </Button>
                </div>
              </Card>
            </aside>
          </div>
          <div className="form-footer product-save-footer">
            <span>
              {isSaved
                ? "Product and SEO details saved to your catalog."
                : busy
                  ? "Finishing your request…"
                  : "Changes are saved when you select Save."}
            </span>
            <div className="product-row-actions">
              {product && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setArchive(true)}
                >
                  Archive product
                </Button>
              )}
              <Button type="submit">
                <Icon name="check" size={16} />
                {saving ? "Saving…" : "Save product & SEO"}
              </Button>
            </div>
          </div>
        </fieldset>
      </form>
      {archive && product && (
        <ArchiveProductDialog
          product={product}
          onClose={() => setArchive(false)}
          onArchived={() => router.replace("/products")}
        />
      )}
    </>
  );
}

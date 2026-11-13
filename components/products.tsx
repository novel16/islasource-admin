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
  Field,
  PageHeader,
  SearchFilter,
} from "./ui";
import { Icon } from "./ui/icon";
import { type Product } from "@/lib/data";
const images = [
  { src: "/images/squid.jpg", label: "Dried squid" },
  { src: "/images/crab.jpg", label: "Blue crab" },
  { src: "/images/scallops.jpg", label: "Scallops" },
  { src: "/images/dried-fish.jpg", label: "Dried fish" },
];
const categories = ["Dried seafood", "Fresh seafood", "Frozen seafood"];
export function ProductList() {
  const { data } = useDemo();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const rows = data.products.filter(
    (p) =>
      (category === "All" || p.category === category) &&
      `${p.name} ${p.slug} ${p.category}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        eyebrow="THE ISLAND COLLECTION"
        title="Products"
        description="Carefully curated seafood, with a story worth sharing."
        actions={
          <ButtonLink href="/products/new">
            <Icon name="plus" size={17} />
            Add product
          </ButtonLink>
        }
      />
      <Card>
        <SearchFilter
          query={query}
          setQuery={setQuery}
          status={category}
          setStatus={setCategory}
          statuses={categories}
          placeholder="Search products, categories, or slugs…"
        />
        {rows.length ? (
          <DataTable
            headers={[
              "Product",
              "Category",
              "Unit",
              "Search visibility",
              "Status",
              "",
            ]}
          >
            {rows.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link className="product-cell" href={`/products/${p.id}`}>
                    <Image src={p.image} alt={p.name} width={53} height={51} />
                    <span>
                      <strong>{p.name}</strong>
                      <small>/{p.slug}</small>
                    </span>
                  </Link>
                </td>
                <td>{p.category}</td>
                <td>Per {p.unit}</td>
                <td>
                  <span>{p.indexable ? "Indexable" : "No index"}</span>
                  <small>
                    {p.meta_title ? "SEO details set" : "SEO details needed"}
                  </small>
                </td>
                <td>
                  <Badge>{p.status}</Badge>
                </td>
                <td>
                  <Link href={`/products/${p.id}`} className="text-link">
                    <Icon name="edit" size={14} />
                    Edit product
                  </Link>
                </td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <EmptyState />
        )}
        <div className="table-footer">
          {rows.length} of {data.products.length} products
          <span>Saved changes stay in this browser</span>
        </div>
      </Card>
      <div className="inline-tip">
        <Icon name="help" size={17} />
        Catalog changes are local demo content. They do not publish to the
        public storefront.
      </div>
    </>
  );
}
const blankProduct: Product = {
  id: "new",
  name: "",
  category: "Dried seafood",
  image: "/images/squid.jpg",
  unit: "kg",
  status: "Draft",
  description: "",
  specs:
    "Sourced on request from Bantayan Island, Cebu. Grade, packing and availability confirmed in your quotation.",
  slug: "",
  meta_title: "",
  meta_description: "",
  og_title: "",
  og_description: "",
  og_image: "/images/squid.jpg",
  indexable: true,
};
export function ProductDetail({ id }: { id: string }) {
  const { data } = useDemo();
  const p =
    id === "new" ? blankProduct : data.products.find((p) => p.id === id);
  return p ? (
    <ProductEditor key={id} initial={p} />
  ) : (
    <>
      <PageHeader title="Product not found" />
      <ButtonLink href="/products">Back to products</ButtonLink>
    </>
  );
}
function ProductEditor({ initial }: { initial: Product }) {
  const { data, update, notify } = useDemo();
  const router = useRouter();
  const [p, setP] = useState(initial);
  const [error, setError] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const isNew = initial.id === "new";
  function change(key: keyof Product, value: string | boolean) {
    setP({ ...p, [key]: value });
    setIsSaved(false);
  }
  function save() {
    const slug = p.slug.trim().toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      setError(
        "Use lowercase letters, numbers, and single hyphens in the product slug.",
      );
      return;
    }
    if (data.products.some((x) => x.slug === slug && x.id !== p.id)) {
      setError("That slug is already used by another product.");
      return;
    }
    const saved = {
      ...p,
      name: p.name.trim(),
      slug,
      id: isNew ? `product-${slug}` : p.id,
    };
    if (
      !saved.name ||
      !saved.description.trim() ||
      !saved.meta_title.trim() ||
      !saved.meta_description.trim()
    ) {
      setError(
        "Complete the name, content description, and search metadata before saving.",
      );
      return;
    }
    update((d) => ({
      ...d,
      products: isNew
        ? [...d.products, saved]
        : d.products.map((x) => (x.id === p.id ? saved : x)),
    }));
    setError("");
    setIsSaved(true);
    notify(
      isNew
        ? "Product added to the local demo catalog."
        : "Product and SEO details saved. The catalog now reflects your changes.",
    );
    if (isNew) router.replace(`/products/${saved.id}`);
  }
  function text(
    key: keyof Product,
    label: string,
    options: {
      required?: boolean;
      maxLength?: number;
      hint?: string;
      multiline?: boolean;
      className?: string;
    } = {},
  ) {
    return (
      <Field label={label} hint={options.hint} className={options.className}>
        {options.multiline ? (
          <textarea
            aria-label={label}
            value={String(p[key])}
            onChange={(e) => change(key, e.target.value)}
            required={options.required}
            maxLength={options.maxLength}
            rows={3}
          />
        ) : (
          <input
            aria-label={label}
            value={String(p[key])}
            onChange={(e) => change(key, e.target.value)}
            required={options.required}
            maxLength={options.maxLength}
          />
        )}
      </Field>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <BackLink href="/products">All products</BackLink>
      <PageHeader
        eyebrow="PRODUCT EDITOR"
        title={isNew ? "A new island favorite" : initial.name}
        description="Make every detail as good as the catch."
        actions={
          <>
            <Badge>{isSaved ? "Saved" : p.status}</Badge>
            <Button type="submit">
              <Icon name="check" size={16} />
              {isNew ? "Add product" : "Save changes"}
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
            subtitle="This is the content your customers will read"
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
                hint: "Describe the product for your catalog. This is separate from the search description.",
              })}
              {text("specs", "Specifications & packing", {
                multiline: true,
                className: "full",
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
                hint: "Lowercase letters, numbers, and hyphens. Example: premium-dried-squid",
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
              {text("og_title", "Open Graph title", {
                className: "full",
                maxLength: 100,
                hint: "Title shown when this product is shared.",
              })}
              {text("og_description", "Open Graph description", {
                multiline: true,
                className: "full",
                maxLength: 200,
              })}
              {text("og_image", "Open Graph image path", {
                className: "full",
                hint: "Use a supplied demo image path, such as /images/squid.jpg.",
              })}
            </div>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={p.indexable}
                onChange={(e) => change("indexable", e.target.checked)}
              />
              <span>
                Allow this product in search results
                <small>
                  Controls the future storefront product’s indexability. This
                  admin workspace always uses noindex.
                </small>
              </span>
            </label>
          </Card>
        </div>
        <aside className="detail-aside">
          <Card
            title="Product image"
            subtitle="Choose a supplied demo photograph"
          >
            <div className="product-editor-image">
              <Image
                src={p.image}
                alt={p.name || "Selected product photograph"}
                fill
                sizes="310px"
              />
            </div>
            <div className="image-options">
              {images.map((i) => (
                <button
                  key={i.src}
                  type="button"
                  aria-label={`Select ${i.label} image`}
                  aria-pressed={p.image === i.src}
                  className={p.image === i.src ? "selected" : ""}
                  onClick={() => {
                    setP({ ...p, image: i.src, og_image: i.src });
                    setIsSaved(false);
                  }}
                >
                  <Image src={i.src} alt="" width={48} height={44} />
                </button>
              ))}
            </div>
          </Card>
          <Card title="Catalog settings">
            <div className="product-settings">
              <Field label="Category">
                <select
                  aria-label="Category"
                  value={p.category}
                  onChange={(e) => change("category", e.target.value)}
                >
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select
                  aria-label="Status"
                  value={p.status}
                  onChange={(e) => change("status", e.target.value)}
                >
                  <option>Published</option>
                  <option>Draft</option>
                  <option>Hidden</option>
                </select>
              </Field>
              <Field label="Selling unit">
                <select
                  aria-label="Selling unit"
                  value={p.unit}
                  onChange={(e) => change("unit", e.target.value)}
                >
                  <option value="kg">Kilogram (kg)</option>
                  <option value="pack">Pack</option>
                  <option value="piece">Piece</option>
                </select>
              </Field>
              <p className="status-explanation">
                Status changes update this demo catalog only. No public product
                is published.
              </p>
            </div>
          </Card>
          <Card
            title="Search result preview"
            subtitle={
              p.indexable ? "Updates as you edit" : "Search indexing disabled"
            }
          >
            <div className="search-preview">
              <div className="preview-url">
                islasource.example › seafood › {p.slug || "your-product"}
              </div>
              <h3>{p.meta_title || p.name || "Your product title"}</h3>
              <p>
                {p.meta_description ||
                  "Your product’s search description will appear here."}
              </p>
            </div>
          </Card>
          <Card title="Social sharing preview">
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
              <small className="muted">Image: {p.og_image || p.image}</small>
            </div>
          </Card>
        </aside>
      </div>
      <div
        className="form-footer"
        style={{
          marginTop: 24,
          border: "1px solid var(--line)",
          borderRadius: 10,
        }}
      >
        <span>
          {isSaved
            ? "All changes saved in this browser."
            : "Your edits update this demo only."}
        </span>
        <Button type="submit">
          <Icon name="check" size={16} />
          Save product & SEO
        </Button>
      </div>
    </form>
  );
}

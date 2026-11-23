"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  createProductsClient,
  productCategories,
  productListPath,
  productStatuses,
  type CatalogProduct,
  type ProductPage,
} from "@/lib/products";
import { useAuth } from "../auth-provider";
import { useWorkspace } from "../workspace-provider";
import { useApiResource } from "../use-api-resource";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  DataTable,
  EmptyState,
  PageHeader,
  SearchFilter,
} from "../ui";
import { Icon } from "../ui/icon";
import { ProductImage } from "./product-image";
import { ArchiveProductDialog } from "./archive-dialog";

export function ProductList() {
  const { request } = useAuth();
  const { notify } = useWorkspace();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("All");
  const [archived, setArchived] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<CatalogProduct | null>(null);
  const [restoring, setRestoring] = useState<number | null>(null);
  const [actionError, setActionError] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(timer);
  }, [query]);
  const { data, error, loading, retry } = useApiResource<ProductPage>(
    productListPath({ search: debounced, category, status, archived, page }),
  );
  const rows = data?.data ?? [];
  return (
    <>
      <PageHeader
        eyebrow="THE ISLAND COLLECTION"
        title="Products"
        description="Your seafood catalog, sourced on request and quoted with care."
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
          setQuery={(value) => {
            setQuery(value);
            setPage(1);
          }}
          status={category}
          setStatus={(value) => {
            setCategory(value);
            setPage(1);
          }}
          statuses={[...productCategories]}
          placeholder="Search products, categories, or slugs…"
        />
        <div className="product-list-options">
          <label>
            Publication status{" "}
            <select
              aria-label="Filter by publication status"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="All">All statuses</option>
              {productStatuses.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={archived}
              onChange={(event) => {
                setArchived(event.target.checked);
                setPage(1);
              }}
            />
            Archived products
          </label>
        </div>
        {actionError && (
          <p className="form-error" role="alert">
            {actionError}
          </p>
        )}
        {loading ? (
          <p className="catalog-feedback" role="status">
            Loading products…
          </p>
        ) : error ? (
          <div className="catalog-feedback">
            <p role="alert">{error.message}</p>
            <Button type="button" variant="secondary" onClick={retry}>
              Try again
            </Button>
          </div>
        ) : rows.length ? (
          <DataTable
            headers={[
              "Product",
              "Category",
              "Unit",
              "Search visibility",
              "Status",
              "Actions",
            ]}
          >
            {rows.map((product) => {
              const identity = (
                <>
                  <ProductImage
                    path={product.image}
                    alt={product.image_alt || product.name}
                    width={53}
                    height={51}
                  />
                  <span>
                    <strong>{product.name}</strong>
                    <small>/{product.slug}</small>
                  </span>
                </>
              );
              return (
                <tr key={product.id}>
                  <td>
                    {archived ? (
                      <div className="product-cell">{identity}</div>
                    ) : (
                      <Link
                        className="product-cell"
                        href={`/products/${product.id}`}
                      >
                        {identity}
                      </Link>
                    )}
                  </td>
                  <td>{product.category}</td>
                  <td>
                    Per {product.unit}
                    <small>
                      Minimum {product.min_order_quantity} {product.unit}
                    </small>
                  </td>
                  <td>
                    <span>{product.indexable ? "Indexable" : "No index"}</span>
                    <small>
                      {product.meta_title
                        ? "SEO details set"
                        : "SEO details needed"}
                    </small>
                  </td>
                  <td>
                    <Badge>{archived ? "Archived" : product.status}</Badge>
                  </td>
                  <td>
                    <div className="product-row-actions">
                      {archived ? (
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={restoring !== null}
                          onClick={async () => {
                            setRestoring(product.id);
                            setActionError("");
                            try {
                              await createProductsClient(request).restore(
                                product.id,
                              );
                              notify(`${product.name} restored.`);
                              if (rows.length === 1 && page > 1)
                                setPage(page - 1);
                              else retry();
                            } catch (failure) {
                              setActionError(
                                failure instanceof Error
                                  ? failure.message
                                  : "We couldn’t restore this product.",
                              );
                            } finally {
                              setRestoring(null);
                            }
                          }}
                        >
                          {restoring === product.id
                            ? "Restoring…"
                            : "Restore product"}
                        </Button>
                      ) : (
                        <>
                          <Link
                            href={`/products/${product.id}`}
                            className="text-link"
                          >
                            <Icon name="edit" size={14} />
                            Edit product
                          </Link>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setSelected(product)}
                          >
                            Archive
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </DataTable>
        ) : (
          <EmptyState
            title={
              query || category !== "All" || status !== "All"
                ? "No matching products"
                : archived
                  ? "No archived products"
                  : "Your catalog starts here"
            }
            description={
              archived
                ? "Archived products will appear here for recovery."
                : "Add a product or adjust your search and filters."
            }
          />
        )}
        {data && (
          <div className="table-footer">
            <span>
              {data.meta.from ?? 0}–{data.meta.to ?? 0} of {data.meta.total}{" "}
              products
            </span>
            <div className="pagination-controls">
              <Button
                type="button"
                variant="ghost"
                disabled={page <= 1 || loading}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span>
                Page {data.meta.current_page} of {data.meta.last_page}
              </span>
              <Button
                type="button"
                variant="ghost"
                disabled={page >= data.meta.last_page || loading}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
      <div className="inline-tip">
        <Icon name="help" size={17} />
        Products are saved to your catalog. Public storefront connection follows
        in its own step.
      </div>
      {selected && (
        <ArchiveProductDialog
          product={selected}
          onClose={() => setSelected(null)}
          onArchived={() => {
            setSelected(null);
            if (rows.length === 1 && page > 1) setPage(page - 1);
            else retry();
          }}
        />
      )}
    </>
  );
}

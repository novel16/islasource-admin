"use client";

import { apiEndpoints } from "@/lib/api";
import { type CatalogProduct } from "@/lib/products";
import { useApiResource } from "../use-api-resource";
import { BackLink, Button, ButtonLink, Card, PageHeader } from "../ui";
import { ProductEditor } from "./product-editor";

export function ProductDetail({ id }: { id: string }) {
  const isNew = id === "new";
  const valid = /^[1-9][0-9]*$/.test(id);
  const { data, error, loading, retry } = useApiResource<{
    data: CatalogProduct;
  }>(!isNew && valid ? apiEndpoints.product(id) : null);
  if (isNew) return <ProductEditor key="new" />;
  if (!valid || error?.status === 404)
    return (
      <>
        <PageHeader
          title="Product not found"
          description="This product may have been archived. Check Archived products to restore it."
        />
        <ButtonLink href="/products">Back to products</ButtonLink>
      </>
    );
  if (loading)
    return (
      <>
        <BackLink href="/products">All products</BackLink>
        <Card>
          <p className="catalog-feedback" role="status">
            Loading product details…
          </p>
        </Card>
      </>
    );
  if (error || !data)
    return (
      <>
        <BackLink href="/products">All products</BackLink>
        <Card>
          <div className="catalog-feedback">
            <p role="alert">
              {error?.message || "We couldn’t load this product."}
            </p>
            <Button onClick={retry}>Try again</Button>
          </div>
        </Card>
      </>
    );
  return <ProductEditor key={id} initial={data.data} />;
}

"use client";

import { useState } from "react";
import { createProductsClient, type CatalogProduct } from "@/lib/products";
import { useAuth } from "../auth-provider";
import { useDemo } from "../demo-provider";
import { Button, Dialog } from "../ui";

export function ArchiveProductDialog({
  product,
  onClose,
  onArchived,
}: {
  product: Pick<CatalogProduct, "id" | "name">;
  onClose: () => void;
  onArchived: () => void;
}) {
  const { request } = useAuth();
  const { notify } = useDemo();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Dialog
      title="Archive this product?"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <div className="dialog-body">
        <p>
          <strong>{product.name}</strong> will leave the active catalog. You can
          bring it back from Archived products. Its details and previous slugs
          are kept.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="dialog-footer">
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={onClose}
        >
          Keep product
        </Button>
        <Button
          type="button"
          variant="danger"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await createProductsClient(request).archive(product.id);
              notify(
                `${product.name} archived. You can restore it from Archived products.`,
              );
              onArchived();
            } catch (failure) {
              setError(
                failure instanceof Error
                  ? failure.message
                  : "We couldn’t archive this product. Please try again.",
              );
              setBusy(false);
            }
          }}
        >
          {busy ? "Archiving…" : "Archive product"}
        </Button>
      </div>
    </Dialog>
  );
}

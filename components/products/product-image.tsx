"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth-provider";
import { Field } from "../ui";
import { createProductsClient, productImageSrc } from "@/lib/products";

export function ProductImage({
  path,
  alt,
  ...props
}: { path: string; alt: string } & Omit<
  React.ComponentProps<typeof Image>,
  "src" | "alt"
>) {
  const src = productImageSrc(path);
  return (
    <Image
      {...props}
      src={src}
      alt={alt}
      unoptimized={path.startsWith("/storage/")}
    />
  );
}

export function ProductImageUpload({
  label,
  disabled,
  onChange,
  onBusyChange,
}: {
  label: string;
  disabled?: boolean;
  onChange: (path: string) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const { request } = useAuth();
  const active = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => () => active.current?.abort(), []);
  return (
    <div className="product-upload">
      <Field label={label} hint="JPG, PNG or WebP · Up to 5 MB">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled || busy}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            active.current?.abort();
            const controller = new AbortController();
            active.current = controller;
            setBusy(true);
            onBusyChange(true);
            setError("");
            try {
              const path = await createProductsClient(request).upload(
                file,
                controller.signal,
              );
              if (!controller.signal.aborted) onChange(path);
            } catch (failure) {
              if (!controller.signal.aborted)
                setError(
                  failure instanceof Error
                    ? failure.message
                    : "We couldn’t upload this image. Please try again.",
                );
            } finally {
              if (!controller.signal.aborted) {
                setBusy(false);
                onBusyChange(false);
              }
            }
          }}
        />
      </Field>
      {busy && (
        <p role="status" className="muted">
          Uploading image…
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

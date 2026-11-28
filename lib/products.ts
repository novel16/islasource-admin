import {
  API_BASE_URL,
  ApiError,
  apiEndpoints,
  type createApiClient,
} from "./api.ts";

export const productCategories = [
  "Dried seafood",
  "Fresh seafood",
  "Frozen seafood",
] as const;
export const productStatuses = ["Draft", "Published", "Hidden"] as const;
export const productImages = [
  { src: "/images/squid.jpg", label: "Dried squid" },
  { src: "/images/crab.jpg", label: "Blue crab" },
  { src: "/images/scallops.jpg", label: "Scallops" },
  { src: "/images/dried-fish.jpg", label: "Dried fish" },
];

export const MAX_GALLERY_IMAGES = 7;

export type ProductGalleryImage = {
  image: string;
  image_alt: string;
};

export type ProductDraft = {
  name: string;
  category: (typeof productCategories)[number];
  unit: "kg" | "pack" | "piece";
  status: (typeof productStatuses)[number];
  description: string;
  specs: string;
  image: string;
  image_alt: string;
  gallery_images: ProductGalleryImage[];
  slug: string;
  meta_title: string;
  meta_description: string;
  og_title: string;
  og_description: string;
  og_image: string;
  canonical_url: string;
  indexable: boolean;
  min_order_quantity: string;
  availability_note: string;
};
export type CatalogProduct = ProductDraft & {
  id: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  previous_slugs?: string[];
};
export type ProductPage = {
  data: CatalogProduct[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
};
export type ProductFilters = {
  search?: string;
  category?: string;
  status?: string;
  archived?: boolean;
  page?: number;
  per_page?: number;
};
type SearchResult = { label: string; href: string };

export function workspaceSearchResults(
  local: SearchResult[],
  catalog: Pick<CatalogProduct, "id" | "name">[],
  query: string,
): SearchResult[] {
  return [
    ...catalog.map((product) => ({
      label: product.name,
      href: `/products/${product.id}`,
    })),
    ...local.filter((result) =>
      result.label.toLowerCase().includes(query.trim().toLowerCase()),
    ),
  ].slice(0, 6);
}

export const blankProduct: ProductDraft = {
  name: "",
  category: "Dried seafood",
  image: "/images/squid.jpg",
  image_alt: "",
  gallery_images: [],
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
  og_image: "",
  canonical_url: "",
  indexable: true,
  min_order_quantity: "1.000",
  availability_note:
    "Sourced on request. Availability and final pricing are confirmed after your quote request.",
};

export function productListPath(filters: ProductFilters = {}): string {
  const query = new URLSearchParams({
    page: String(filters.page ?? 1),
    per_page: String(filters.per_page ?? 15),
    archived: filters.archived ? "1" : "0",
  });
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  if (filters.category && filters.category !== "All")
    query.set("category", filters.category);
  if (filters.status && filters.status !== "All")
    query.set("status", filters.status);
  return `${apiEndpoints.products}?${query}`;
}

export function productPayload(
  input: Omit<ProductDraft, "gallery_images"> & {
    gallery_images?: ProductGalleryImage[];
  },
): ProductDraft {
  return {
    name: input.name.trim(),
    category: input.category,
    unit: input.unit,
    status: input.status,
    description: input.description.trim(),
    specs: input.specs.trim(),
    image: input.image,
    image_alt: input.image_alt.trim(),
    gallery_images: (input.gallery_images ?? [])
      .filter((entry) => Boolean(entry?.image?.trim()))
      .slice(0, MAX_GALLERY_IMAGES)
      .map((entry) => ({
        image: entry.image.trim(),
        image_alt: (entry.image_alt ?? "").trim(),
      })),
    slug: input.slug.trim().toLowerCase(),
    meta_title: input.meta_title.trim(),
    meta_description: input.meta_description.trim(),
    og_title: input.og_title.trim(),
    og_description: input.og_description.trim(),
    og_image: input.og_image,
    canonical_url: input.canonical_url.trim(),
    indexable: input.indexable,
    min_order_quantity: String(input.min_order_quantity),
    availability_note: input.availability_note.trim(),
  };
}

export function slugFromName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function productImageSrc(
  path: string,
  apiUrl = API_BASE_URL,
): string {
  if (productImages.some((image) => image.src === path)) return path;
  if (/^\/storage\/products\/[a-zA-Z0-9_-]+\.(?:jpe?g|png|webp)$/.test(path))
    return new URL(path, new URL(apiUrl).origin).toString();
  return "/images/squid.jpg";
}

type Request = ReturnType<typeof createApiClient>["request"];
export function createProductsClient(request: Request) {
  return {
    list: (filters: ProductFilters = {}, signal?: AbortSignal) =>
      request<ProductPage>(productListPath(filters), { signal }),
    async show(
      id: number | string,
      signal?: AbortSignal,
    ): Promise<CatalogProduct> {
      const result = await request<{ data: CatalogProduct }>(
        apiEndpoints.product(id),
        { signal },
      );
      return result.data;
    },
    async save(draft: ProductDraft, id?: number): Promise<CatalogProduct> {
      const result = await request<{ data: CatalogProduct }>(
        id ? apiEndpoints.product(id) : apiEndpoints.products,
        {
          method: id ? "PATCH" : "POST",
          body: JSON.stringify(productPayload(draft)),
        },
      );
      return result.data;
    },
    archive: (id: number) =>
      request<void>(apiEndpoints.product(id), { method: "DELETE" }),
    async restore(id: number): Promise<CatalogProduct> {
      return (
        await request<{ data: CatalogProduct }>(
          apiEndpoints.productRestore(id),
          { method: "POST" },
        )
      ).data;
    },
    async upload(file: File, signal?: AbortSignal): Promise<string> {
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 5 * 1024 * 1024
      ) {
        throw new ApiError(422, "Choose a JPG, PNG or WebP image up to 5 MB.", {
          image: ["Choose a JPG, PNG or WebP image up to 5 MB."],
        });
      }
      const body = new FormData();
      body.append("image", file);
      return (
        await request<{ data: { image: string } }>(apiEndpoints.productImages, {
          method: "POST",
          body,
          signal,
        })
      ).data.image;
    },
  };
}

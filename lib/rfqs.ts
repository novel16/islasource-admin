export type ApiRfqItem = {
  id: number;
  product_id: number | null;
  name: string;
  slug: string;
  unit: "kg" | "pack" | "piece";
  quantity: string | number;
  notes: string;
};

export type ApiRfq = {
  id: number;
  reference: string;
  customer_name: string;
  email: string;
  phone: string;
  location: string;
  requested_delivery_date: string | null;
  notes: string;
  status: "New";
  items: ApiRfqItem[];
  created_at: string;
};

export type ApiRfqPage = {
  data: ApiRfq[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
};

export function rfqListPath(filters: {
  search?: string;
  per_page?: number;
  page?: number;
} = {}): string {
  const query = new URLSearchParams({
    per_page: String(filters.per_page ?? 15),
    page: String(filters.page ?? 1),
  });
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  return `/admin/rfqs?${query.toString()}`;
}

import { ApiError, type createApiClient } from "./api.ts";
import { type ApiQuotationSummary } from "./quotations.ts";

export const rfqStatuses = [
  "New",
  "Reviewing",
  "Ready",
  "Quoted",
  "Closed",
] as const;

export type RfqStatus = (typeof rfqStatuses)[number];

export type ApiRfqItem = {
  id: number;
  product_id: number | null;
  name: string;
  slug: string;
  unit: "kg" | "pack" | "piece";
  quantity: string | number;
  notes: string;
};

export type ApiRfqNote = {
  id: number;
  body: string;
  author_name: string;
  created_at: string;
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
  status: RfqStatus;
  items: ApiRfqItem[];
  internal_notes?: ApiRfqNote[];
  quotations?: ApiQuotationSummary[];
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

export function rfqListPath(
  filters: {
    search?: string;
    status?: string;
    per_page?: number;
    page?: number;
  } = {},
): string {
  const query = new URLSearchParams({
    per_page: String(filters.per_page ?? 15),
    page: String(filters.page ?? 1),
  });
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  if (filters.status && filters.status !== "All")
    query.set("status", filters.status);
  return `/admin/rfqs?${query.toString()}`;
}

type Request = ReturnType<typeof createApiClient>["request"];

export function createRfqsClient(request: Request) {
  return {
    async updateStatus(id: number, status: RfqStatus): Promise<ApiRfq> {
      const result = await request<{ data: ApiRfq }>(`/admin/rfqs/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      return result.data;
    },
    async addNote(id: number, body: string): Promise<ApiRfqNote> {
      const trimmed = body.trim();
      if (!trimmed || trimmed.length > 2000) {
        throw new ApiError(
          422,
          "Enter a note up to 2,000 characters before saving.",
          { body: ["Enter a note up to 2,000 characters before saving."] },
        );
      }
      const result = await request<{ data: ApiRfqNote }>(
        `/admin/rfqs/${id}/notes`,
        {
          method: "POST",
          body: JSON.stringify({ body: trimmed }),
        },
      );
      return result.data;
    },
  };
}

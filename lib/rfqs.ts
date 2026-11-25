import { ApiError, apiEndpoints, type createApiClient } from "./api.ts";
import { type ApiQuotationSummary } from "./quotations.ts";

export const rfqStatuses = [
  "New",
  "Reviewing",
  "Waiting",
  "Ready",
  "Quoted",
  "Closed",
] as const;

export type RfqStatus = (typeof rfqStatuses)[number];
export type RfqScheduleStatus =
  | "Proposed"
  | "Accepted"
  | "Declined"
  | "ClosedUnavailable"
  | null;

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
  proposed_available_date?: string | null;
  proposed_delivery_date?: string | null;
  notes: string;
  schedule_notice?: string;
  status: RfqStatus;
  schedule_status?: RfqScheduleStatus;
  schedule_responded_at?: string | null;
  schedule_customer_note?: string;
  schedule_url?: string;
  email_sent?: boolean;
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
  return `${apiEndpoints.rfqs}?${query.toString()}`;
}

type Request = ReturnType<typeof createApiClient>["request"];

export function createRfqsClient(request: Request) {
  return {
    async updateStatus(id: number, status: RfqStatus): Promise<ApiRfq> {
      const result = await request<{ data: ApiRfq }>(apiEndpoints.rfq(id), {
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
        apiEndpoints.rfqNotes(id),
        {
          method: "POST",
          body: JSON.stringify({ body: trimmed }),
        },
      );
      return result.data;
    },
    async sendSupplyNotice(
      id: number,
      payload: {
        mode: "reschedule" | "unavailable";
        proposed_available_date?: string | null;
        proposed_delivery_date?: string | null;
        notice: string;
      },
    ): Promise<ApiRfq> {
      const result = await request<{ data: ApiRfq }>(
        apiEndpoints.rfqSupplyNotice(id),
        {
          method: "POST",
          body: JSON.stringify({
            mode: payload.mode,
            proposed_available_date:
              payload.mode === "reschedule"
                ? payload.proposed_available_date
                : null,
            proposed_delivery_date:
              payload.mode === "reschedule"
                ? payload.proposed_delivery_date
                : null,
            notice: payload.notice.trim(),
          }),
        },
      );
      return result.data;
    },
  };
}

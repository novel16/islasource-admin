import { type createApiClient } from "./api.ts";

export const quotationStatuses = [
  "Draft",
  "Sent",
  "Accepted",
  "Declined",
  "Expired",
  "Superseded",
  "Cancelled",
] as const;

export type QuotationStatus = (typeof quotationStatuses)[number];

export type ApiQuotationItem = {
  id: number;
  rfq_item_id: number | null;
  product_name: string;
  unit: "kg" | "pack" | "piece";
  quantity: string | number;
  specs: string;
  is_available: boolean;
  unit_cost_centavos: number;
  line_cost_centavos: number;
  line_selling_centavos: number;
};

export type ApiQuotationSummary = {
  id: number;
  reference: string;
  version: number;
  status: QuotationStatus;
  total_centavos: number;
  created_at: string;
};

export type ApiQuotation = {
  id: number;
  rfq_id: number;
  reference: string;
  version: number;
  status: QuotationStatus;
  seafood_cost_centavos: number;
  handling_centavos: number;
  markup_percent: string;
  markup_centavos: number;
  subtotal_centavos: number;
  delivery_centavos: number;
  total_centavos: number;
  deposit_percent: number;
  deposit_centavos: number;
  balance_centavos: number;
  validity_hours: number;
  valid_until: string | null;
  terms: string;
  sent_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  decline_reason: string;
  cancelled_at: string | null;
  cancel_reason: string;
  last_emailed_at: string | null;
  last_email_error: string;
  item_count?: number;
  share_url?: string;
  email_sent?: boolean;
  rfq?: {
    id: number;
    reference: string;
    status: string;
    customer_name: string;
    email: string;
    phone: string;
    location: string;
    requested_delivery_date: string | null;
  };
  items?: ApiQuotationItem[];
  versions?: ApiQuotationSummary[];
  order?: {
    id: number;
    reference: string;
    status: string;
    payment_status: string;
  } | null;
  created_at: string;
  updated_at: string;
};

export type ApiQuotationPage = {
  data: ApiQuotation[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
};

export type UpdateQuotationPayload = {
  handling_centavos: number;
  markup_percent: string;
  delivery_centavos: number;
  deposit_percent: number;
  validity_hours: number;
  terms: string;
  items: {
    id: number;
    quantity: string;
    specs: string;
    is_available: boolean;
    unit_cost_centavos: number;
  }[];
};

export function quotationListPath(
  filters: {
    search?: string;
    status?: string;
    rfq_id?: number;
    page?: number;
    per_page?: number;
  } = {},
): string {
  const query = new URLSearchParams({
    page: String(filters.page ?? 1),
    per_page: String(filters.per_page ?? 15),
  });
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  if (filters.status && filters.status !== "All")
    query.set("status", filters.status);
  if (filters.rfq_id) query.set("rfq_id", String(filters.rfq_id));
  return `/admin/quotations?${query.toString()}`;
}

export function formatValidityHours(hours: number): string {
  if (hours % 24 === 0) {
    const days = hours / 24;
    return `${hours} hours (${days} ${days === 1 ? "day" : "days"})`;
  }
  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
}

export function previewQuotationTotals(input: {
  items: {
    quantity: number | string;
    unit_cost_centavos: number;
    is_available: boolean;
  }[];
  handling_centavos: number;
  markup_percent: number | string;
  delivery_centavos: number;
  deposit_percent: number;
}) {
  const lineCosts: number[] = [];
  let seafoodCost = 0;

  for (const item of input.items) {
    if (!item.is_available) {
      lineCosts.push(0);
      continue;
    }
    const qty = Number(item.quantity);
    const unitCost = Math.max(0, Math.round(item.unit_cost_centavos || 0));
    const qtyMilli = Number.isFinite(qty) && qty > 0 ? Math.round(qty * 1000) : 0;
    const cost = Math.round((qtyMilli * unitCost) / 1000);
    lineCosts.push(cost);
    seafoodCost += cost;
  }

  const handling = Math.max(0, Math.round(input.handling_centavos || 0));
  const markupPct = Number(input.markup_percent);
  const markupBps =
    Number.isFinite(markupPct) && markupPct >= 0
      ? Math.round(markupPct * 100)
      : 0;
  const markup = Math.round(((seafoodCost + handling) * markupBps) / 10000);
  const subtotal = seafoodCost + handling + markup;
  const delivery = Math.max(0, Math.round(input.delivery_centavos || 0));
  const total = subtotal + delivery;
  const depositPct = Math.min(100, Math.max(0, Math.round(input.deposit_percent || 0)));
  const deposit = Math.round((total * depositPct) / 100);
  const balance = total - deposit;

  const overhead = handling + markup;
  const lineSellings = new Array<number>(input.items.length).fill(0);

  if (seafoodCost > 0) {
    const remainders: { index: number; remainder: number }[] = [];
    let allocated = 0;
    for (let i = 0; i < lineCosts.length; i++) {
      const cost = lineCosts[i];
      if (cost <= 0) continue;
      const numerator = overhead * cost;
      const floorShare = Math.floor(numerator / seafoodCost);
      lineSellings[i] = cost + floorShare;
      allocated += floorShare;
      remainders.push({ index: i, remainder: numerator % seafoodCost });
    }
    const leftover = overhead - allocated;
    if (leftover > 0) {
      remainders.sort(
        (a, b) => b.remainder - a.remainder || a.index - b.index,
      );
      for (let i = 0; i < leftover; i++) {
        lineSellings[remainders[i].index] += 1;
      }
    }
  }

  return {
    items: lineCosts.map((cost, index) => ({
      line_cost_centavos: cost,
      line_selling_centavos: lineSellings[index],
    })),
    seafood_cost_centavos: seafoodCost,
    handling_centavos: handling,
    markup_centavos: markup,
    subtotal_centavos: subtotal,
    delivery_centavos: delivery,
    total_centavos: total,
    deposit_centavos: deposit,
    balance_centavos: balance,
  };
}

type Request = ReturnType<typeof createApiClient>["request"];

export function createQuotationsClient(request: Request) {
  return {
    async createForRfq(
      rfqId: number,
      defaults: {
        validity_hours?: number;
        deposit_percent?: number;
        terms?: string;
      } = {},
    ): Promise<ApiQuotation> {
      const result = await request<{ data: ApiQuotation }>(
        `/admin/rfqs/${rfqId}/quotations`,
        {
          method: "POST",
          body: JSON.stringify(defaults),
        },
      );
      return result.data;
    },
    async update(
      id: number,
      payload: UpdateQuotationPayload,
    ): Promise<ApiQuotation> {
      const result = await request<{ data: ApiQuotation }>(
        `/admin/quotations/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      );
      return result.data;
    },
    discard: (id: number) =>
      request<void>(`/admin/quotations/${id}`, { method: "DELETE" }),
    async send(id: number): Promise<ApiQuotation> {
      const result = await request<{ data: ApiQuotation }>(
        `/admin/quotations/${id}/send`,
        { method: "POST" },
      );
      return result.data;
    },
    async resend(id: number): Promise<ApiQuotation> {
      const result = await request<{ data: ApiQuotation }>(
        `/admin/quotations/${id}/resend`,
        { method: "POST" },
      );
      return result.data;
    },
    async cancel(id: number, reason = ""): Promise<ApiQuotation> {
      const result = await request<{ data: ApiQuotation }>(
        `/admin/quotations/${id}/cancel`,
        {
          method: "POST",
          body: JSON.stringify({ reason: reason.trim() }),
        },
      );
      return result.data;
    },
    async revise(id: number): Promise<ApiQuotation> {
      const result = await request<{ data: ApiQuotation }>(
        `/admin/quotations/${id}/revise`,
        { method: "POST" },
      );
      return result.data;
    },
  };
}

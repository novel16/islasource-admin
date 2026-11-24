import { type createApiClient } from "./api.ts";

export const orderStatuses = [
  "Awaiting Payment",
  "Processing",
  "Packed",
  "Dispatched",
  "Completed",
  "Cancelled",
] as const;

export type OrderStatus = (typeof orderStatuses)[number];
export type OrderPaymentStatus = "Unpaid" | "Paid";

export type ApiOrderItem = {
  id: number;
  product_name: string;
  unit: "kg" | "pack" | "piece";
  quantity: string | number;
  specs: string;
  is_available: boolean;
  line_selling_centavos: number;
};

export type ApiOrderPayment = {
  id: number;
  provider: string;
  payment_method: string;
  status: string;
  amount_centavos: number;
  paymongo_checkout_session_id: string | null;
  paymongo_payment_id: string | null;
  paid_at: string | null;
  failure_reason: string;
  created_at: string;
};

export type ApiOrder = {
  id: number;
  quotation_id: number;
  rfq_id: number;
  reference: string;
  quotation_reference?: string;
  status: OrderStatus;
  payment_status: OrderPaymentStatus;
  customer_name: string;
  email: string;
  phone: string;
  location: string;
  requested_delivery_date: string | null;
  subtotal_centavos: number;
  delivery_centavos: number;
  total_centavos: number;
  paid_centavos: number;
  tracking_url: string;
  paid_at: string | null;
  packed_at: string | null;
  dispatched_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string;
  items?: ApiOrderItem[];
  payments?: ApiOrderPayment[];
  created_at: string;
  updated_at: string;
};

export type ApiOrderPage = {
  data: ApiOrder[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
};

export function orderListPath(
  filters: {
    search?: string;
    status?: string;
    payment_status?: string;
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
  if (filters.payment_status && filters.payment_status !== "All")
    query.set("payment_status", filters.payment_status);
  return `/admin/orders?${query.toString()}`;
}

export function nextOrderStatus(
  order: Pick<ApiOrder, "status" | "payment_status">,
): "Packed" | "Dispatched" | "Completed" | null {
  if (order.payment_status !== "Paid") return null;
  if (order.status === "Processing") return "Packed";
  if (order.status === "Packed") return "Dispatched";
  if (order.status === "Dispatched") return "Completed";
  return null;
}

type Request = ReturnType<typeof createApiClient>["request"];

export function createOrdersClient(request: Request) {
  return {
    async updateStatus(
      id: number,
      status: "Packed" | "Dispatched" | "Completed" | "Cancelled",
      cancelReason?: string,
    ): Promise<ApiOrder> {
      const payload: { status: string; cancel_reason?: string } = { status };
      if (status === "Cancelled" && cancelReason?.trim()) {
        payload.cancel_reason = cancelReason.trim();
      }
      const result = await request<{ data: ApiOrder }>(`/admin/orders/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      return result.data;
    },
  };
}

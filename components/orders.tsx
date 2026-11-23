"use client";

import { BackLink, ButtonLink, Card, EmptyState, PageHeader } from "./ui";
import { Icon } from "./ui/icon";

export function OrderList() {
  return (
    <>
      <PageHeader
        eyebrow="FULFILLMENT & PAYMENTS"
        title="Orders"
        description="Confirmed orders will appear here once deposit payments are enabled for accepted quotations."
        actions={
          <ButtonLink variant="secondary" href="/quotations">
            View quotations
            <Icon name="arrow" size={16} />
          </ButtonLink>
        }
      />
      <Card>
        <EmptyState
          title="No orders yet"
          description="When customers accept a quotation and deposit payments are enabled in the next phase, confirmed orders will be tracked here."
        />
      </Card>
    </>
  );
}

export function OrderDetail({ id }: { id: string }) {
  return (
    <>
      <BackLink href="/orders">All orders</BackLink>
      <PageHeader
        title={`Order ${id} not found`}
        description="Order processing will connect once payment verification is enabled."
      />
      <ButtonLink href="/orders">All orders</ButtonLink>
    </>
  );
}

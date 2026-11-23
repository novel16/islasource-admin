"use client";

import { ButtonLink, PageHeader } from "./ui";
import { LiveQuotationDetail, LiveQuotationList } from "./live-quotations";

export function QuotationList() {
  return <LiveQuotationList />;
}

export function QuotationDetail({ id }: { id: string }) {
  if (/^\d+$/.test(id)) return <LiveQuotationDetail id={Number(id)} />;
  return (
    <>
      <PageHeader
        title="Quotation not found"
        description="Check your quotations list to open a valid record."
      />
      <ButtonLink href="/quotations">All quotations</ButtonLink>
    </>
  );
}

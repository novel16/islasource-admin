import { RfqDetail } from "@/components/rfqs";
export const metadata = { title: "Request details" };
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RfqDetail id={id} />;
}

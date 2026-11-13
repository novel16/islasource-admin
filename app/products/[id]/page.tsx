import { ProductDetail } from "@/components/products";
export const metadata = { title: "Product editor" };
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProductDetail id={id} />;
}

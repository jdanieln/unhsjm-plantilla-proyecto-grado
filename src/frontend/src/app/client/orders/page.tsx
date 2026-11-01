import { ClientOrders } from "@/features/client/components/Orders/ClientOrders";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ new?: string; order?: string }> }) {
  const params = await searchParams;
  const orderId = Number(params.order);
  return <ClientOrders initialNew={params.new === "1"} initialOrderId={Number.isInteger(orderId) && orderId > 0 ? orderId : undefined} />;
}

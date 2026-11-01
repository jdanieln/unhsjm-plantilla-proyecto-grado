import { DeliveryReview } from "@/features/deliveries/DeliveryReview";
import { notFound } from "next/navigation";
import { isResource } from "@/features/admin/config/modules";
import { ResourcePanel } from "@/features/admin/components/ResourcePanel/ResourcePanel";
import { Dashboard } from "@/features/admin/components/Dashboard/Dashboard";

export default async function AdminSection({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (section === "deliveries") return <DeliveryReview />;
  if (section === "dashboard") return <Dashboard />;
  if (!isResource(section)) notFound();
  return <ResourcePanel key={section} resource={section} />;
}

"use client";
import { useOperationalSession } from "@/components/ui/OperationalShell/OperationalShell";
import { DataState, ActionButton } from "@/components/ui/Workspace/Workspace";
import { Overview } from "./Overview";
import { Orders } from "./Orders";
import { Fleet } from "./Fleet";
import { Profile } from "./Profile";
import { Payments } from "./Payments";
import { AssignedTruck } from "./AssignedTruck";

export function OperationsPage({ section }: { section: string }) {
  const { user } = useOperationalSession();
  const id = user.role === "company" ? user.idCompany : user.idDriver;
  if (!id && section !== "profile") return <>
    <DataState empty="Completa tu perfil para comenzar" icon="user" />
    <ActionButton href={`/${user.role}/profile`} variant="primary">Completar perfil</ActionButton>
  </>;
  if (section === "profile") return <Profile />;
  if (section === "orders" || section === "trips") return <Orders />;
  if (section === "drivers" || section === "trucks") return <Fleet kind={section} />;
  if (section === "payments") return <Payments />;
  if (section === "truck") return <AssignedTruck />;
  return <Overview />;
}

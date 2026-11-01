"use client";

import { PaymentsPanel } from "@/components/ui/PaymentsPanel/PaymentsPanel";
import { useClientSession } from "../ClientShell/ClientShell";
import { cancelPayment, getPayments } from "../../services/clientApi";

export function ClientPayments() {
  const { user } = useClientSession();
  return <PaymentsPanel mode="client" enabled={Boolean(user.idClient)} name={user.name} load={getPayments} cancel={cancelPayment} />;
}

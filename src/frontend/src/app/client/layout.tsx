import type { ReactNode } from "react";
import type { Metadata } from "next";
import { ClientShell } from "@/features/client/components/ClientShell/ClientShell";

export const metadata: Metadata = { title: "Mi espacio | TravelDLS" };
export default function ClientLayout({ children }: { children: ReactNode }) {
  return <ClientShell>{children}</ClientShell>;
}

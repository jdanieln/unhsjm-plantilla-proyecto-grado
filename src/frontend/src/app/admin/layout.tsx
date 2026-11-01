import type { ReactNode } from "react";
import type { Metadata } from "next";
import { AdminShell } from "@/features/admin/components/AdminShell/AdminShell";

export const metadata: Metadata = { title: "Administración | TravelDLS" };
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}

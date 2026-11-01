import type { UserRole } from "@/features/auth/types/auth";

const roleDestinations: Record<UserRole, string> = {
  platform_admin: "/admin/dashboard",
  client: "/client/dashboard",
  driver: "/driver/dashboard",
  company: "/company/dashboard",
};

const roleLabels: Record<UserRole, string> = {
  platform_admin: "superadmin",
  client: "cliente",
  driver: "conductor",
  company: "empresa",
};

export function getRoleLabel(role: UserRole): string {
  return roleLabels[role];
}

export function getRoleDestination(role: UserRole): string | null {
  return roleDestinations[role];
}

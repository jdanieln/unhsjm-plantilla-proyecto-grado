import type { Order, Page } from "@/features/client/types/client";

const base = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333").replace(/\/+$/, "");
export class OperationsError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}
export async function api<T>(path: string, method = "GET", body?: object | FormData, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(base + "/api" + path, {
      method, credentials: "include", cache: "no-store", signal,
      headers: { Accept: "application/json", ...(body && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {}) },
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    });
  } catch (cause) {
    if (signal?.aborted) throw cause;
    throw new OperationsError("No se pudo conectar con el servidor.", 0);
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event("operations-session-expired"));
    const validation = data?.errors?.map((error: { message: string }) => error.message).join(" ");
    throw new OperationsError(validation || data?.message || "No se pudo completar la operación.", response.status);
  }
  return data as T;
}
export async function allPages<T>(path: string, signal?: AbortSignal): Promise<T[]> {
  const separator = path.includes("?") ? "&" : "?";
  const first = await api<Page<T>>(path + separator + "page=1&perPage=50", "GET", undefined, signal);
  const rows = [...first.data];
  for (let page = 2; page <= first.meta.lastPage; page++) {
    const next = await api<Page<T>>(path + separator + "page=" + page + "&perPage=50", "GET", undefined, signal);
    rows.push(...next.data);
  }
  return rows;
}
export type Driver = { idDriver: number; idCompany: number; license: string; passport: string; status: string; photoUrl?: string; user?: { name: string; email: string }; company?: { businessName: string } };
export type Truck = { idTruck: number; plate: string; chassis: string; status: string; maintenanceReason?: string | null; idDriver: number; idCategory: number; driver?: Driver; category?: { nameCategory: string }; company?: { businessName: string } };
export type CompanyProfile = { idCompany: number; businessName: string; ruc: string; photoUrl?: string };
export type OperationalOrder = Order & { client?: { companyName: string; user?: { name: string } } };
export const driverLabels: Record<string, string> = { available: "Disponible", ontrip: "En viaje", offline: "Desconectado", inactive: "Inactivo" };
export const truckLabels: Record<string, string> = { active: "Activo", activo: "Activo", mantenimiento: "Mantenimiento", maintenance: "Mantenimiento", inactive: "Inactivo", inactivo: "Inactivo" };

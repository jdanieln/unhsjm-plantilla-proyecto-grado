import type {
  ClientProfile,
  Company,
  NewDetail,
  Order,
  OrderDetail,
  Page,
  Payment,
  Tracking,
} from "../types/client";

const base = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333").replace(/\/+$/, "");

export class ClientApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ClientApiError";
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${base}/api${path}`, {
      ...init,
      credentials: "include",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(init.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
  } catch (error) {
    if (init.signal?.aborted) throw error;
    throw new ClientApiError("No se pudo conectar con el servidor. Inténtalo de nuevo.", 0);
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined")
      window.dispatchEvent(new Event("client-session-expired"));
    const validation = Array.isArray(data?.errors)
      ? data.errors.map((item: { message?: string }) => item.message).filter(Boolean).join(" ")
      : "";
    throw new ClientApiError(
      response.status === 401
        ? "Tu sesión expiró. Inicia sesión nuevamente."
        : response.status === 403
          ? "Tu cuenta no tiene permiso para esta acción."
          : validation || data?.message || "No se pudo completar la solicitud.",
      response.status,
    );
  }
  return data as T;
}

const query = (values: Record<string, string | number | undefined>) =>
  new URLSearchParams(Object.entries(values).filter((entry): entry is [string, string | number] => entry[1] !== undefined).map(([key, value]) => [key, String(value)]));

export const getProfile = (id: number, signal?: AbortSignal) =>
  request<ClientProfile>(`/clients/${id}`, { signal });

export const saveProfile = (id: number | null, data: FormData) =>
  request<ClientProfile>(id ? `/clients/${id}` : "/clients", {
    method: id ? "PUT" : "POST",
    body: data,
  });

export const getOrders = (idClient: number, page = 1, perPage = 10, signal?: AbortSignal) =>
  request<Page<Order>>(`/orders?${query({ idClient, page, perPage })}`, { signal });

export const getOrder = (id: number, signal?: AbortSignal) =>
  request<Order>(`/orders/${id}`, { signal });

export const getCompanies = (page = 1, search = "", signal?: AbortSignal) =>
  request<Page<Company>>(`/companies?${query({ page, perPage: 12, search: search || undefined })}`, { signal });

export const createOrder = (idClient: number, idCompany: number) =>
  request<Order>("/orders", { method: "POST", body: JSON.stringify({ idClient, idCompany }) });

export const createDetail = (idOrder: number, data: NewDetail) => {
  const weight = Number(data.unitWeight);
  if (!Number.isFinite(weight) || weight <= 0) throw new Error("Indica un peso válido.");
  const { cargoDescription, deliveryAddress, typePackaging, weightUnit } = data;
  return request<OrderDetail>("/order-details", {
    method: "POST",
    body: JSON.stringify({ idOrder, cargoDescription, deliveryAddress, typePackaging, unitWeight: `${weight} ${weightUnit}`, amount: 0, quantity: 1 }),
  });
};

export const updateDetail = (id: number, data: NewDetail) => {
  const weight = Number(data.unitWeight);
  if (!Number.isFinite(weight) || weight <= 0) throw new Error("Indica un peso válido.");
  const { cargoDescription, deliveryAddress, typePackaging, weightUnit } = data;
  return request<OrderDetail>(`/order-details/${id}`, {
    method: "PUT",
    body: JSON.stringify({ cargoDescription, deliveryAddress, typePackaging, unitWeight: `${weight} ${weightUnit}` }),
  });
};

export const deleteDetail = (id: number) =>
  request<void>(`/order-details/${id}`, { method: "DELETE" });

export const respondPrice = (id: number, accepted: boolean) =>
  request<Order>(`/orders/${id}/respond-price`, { method: "PATCH", body: JSON.stringify({ accepted }) });

export const simulatePayment = (id: number, data: {
  method: "card" | "transfer";
  billingEmail: string;
  cardHolderName?: string;
  cardNumber?: string;
  expiry?: string;
  cvc?: string;
  transferReference?: string;
}) => request<Order>(`/orders/${id}/payments/simulate`, { method: "POST", body: JSON.stringify(data) });

export const getPayments = (page = 1, perPage = 10, filters: { status?: string; method?: string; search?: string } = {}, signal?: AbortSignal) =>
  request<Page<Payment>>(`/payments?${query({ page, perPage, ...filters })}`, { signal });

export const cancelPayment = (id: number, reason: string) =>
  request<Payment>(`/payments/${id}/cancel`, { method: "PATCH", body: JSON.stringify({ reason }) });

export const getTracking = (id: number, signal?: AbortSignal) => request<Tracking>(`/orders/${id}/tracking`, { signal });

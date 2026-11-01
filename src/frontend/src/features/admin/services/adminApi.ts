import type { PageResult, Resource, Row } from "../types/admin";

const base = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333"
).replace(/\/+$/, "");
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function adminRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${base}/api${path}`, {
      ...init,
      credentials: "include",
      cache: "no-store",
      signal: init.signal
        ? AbortSignal.any([init.signal, AbortSignal.timeout(25000)])
        : AbortSignal.timeout(25000),
      headers: {
        Accept: "application/json",
        ...(init.body && !(init.body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
        ...init.headers,
      },
    });
  } catch (error) {
    if (init.signal?.aborted) throw error;
    throw new ApiError(
      "No se pudo conectar. Comprueba que el servidor esté disponible e inténtalo de nuevo.",
      0,
    );
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined")
      window.dispatchEvent(new Event("admin-session-expired"));
    const validation = Array.isArray(data?.errors)
      ? data.errors
          .map((e: { message?: string }) => e.message)
          .filter(Boolean)
          .join(" ")
      : "";
    throw new ApiError(
      response.status === 401
        ? "Tu sesión expiró. Vuelve a iniciar sesión."
        : response.status === 403
          ? "Tu cuenta no tiene permiso para esta acción."
          : validation ||
            data?.message ||
            "No fue posible completar la operación.",
      response.status,
    );
  }
  return data as T;
}

export function listResource(
  resource: Resource,
  page = 1,
  search = "",
  signal?: AbortSignal,
  perPage = 10,
) {
  return adminRequest<PageResult>(
    `/${resource}?${new URLSearchParams({ page: String(page), perPage: String(perPage), ...(search ? { search } : {}) })}`,
    { signal },
  );
}
// Las listas de selección recorren todas las páginas; no se truncan a los primeros registros.
export async function allRows(
  resource: Resource,
  signal?: AbortSignal,
): Promise<Row[]> {
  const first = await listResource(resource, 1, "", signal, 100);
  const rows = [...first.data];
  for (let page = 2; page <= first.meta.lastPage; page++)
    rows.push(...(await listResource(resource, page, "", signal, 100)).data);
  return rows;
}
export async function saveResource(
  resource: Resource,
  payload: FormData,
  id?: string,
) {
  const multipart = ["companies", "clients", "drivers"].includes(resource);
  const data: Row = {};
  if (!multipart)
    for (const [key, value] of payload)
      data[key] =
        key.startsWith("id") || key === "roleId" ? Number(value) : value;
  return adminRequest<Row>(
    resource === "users" ? "/register" : `/${resource}${id ? `/${id}` : ""}`,
    {
      method: id ? "PUT" : "POST",
      body: multipart ? payload : JSON.stringify(data),
    },
  );
}
export function deleteResource(resource: Resource, id: string) {
  return adminRequest(`/${resource}/${id}`, { method: "DELETE" });
}

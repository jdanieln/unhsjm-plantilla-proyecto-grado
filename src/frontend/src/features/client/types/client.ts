export type Page<T> = {
  data: T[];
  meta: { total: number; currentPage: number; lastPage: number; perPage: number };
  summary?: { totalAmount: number };
};

export type ClientProfile = {
  idClient: number;
  companyName: string;
  ruc: string;
  address: string;
  typeClient: "legal" | "natural";
  photoUrl: string | null;
};

export type Company = {
  idCompany: number;
  businessName: string;
  ruc?: string;
  photoUrl?: string | null;
  deliveredShipmentsCount?: number;
};

export type OrderDetail = {
  deliveryStatus?: string;
  idDriver?: number | null;
  idDetails: number;
  idOrder: number;
  cargoDescription: string;
  amount: number;
  unitWeight: string;
  deliveryAddress: string;
  typePackaging: string;
  rate?: number | null;
  deletedAt?: string | null;
  driver?: { user?: { name?: string }; name?: string } | null;
};

export type Order = {
  idOrder: number;
  idClient: number;
  idCompany: number;
  status: string;
  createdAt: string;
  company?: Company;
  details?: OrderDetail[];
  payment?: Payment | null;
};

export type Payment = {
  idPayment: number;
  idOrder: number;
  amount: number;
  status: string;
  method: "card" | "transfer";
  billingEmail: string;
  referenceCode: string;
  last4?: string | null;
  transferReference?: string | null;
  paidAt?: string | null;
  createdAt: string;
  order?: { idOrder: number; status: string } | null;
  company?: Company | null;
  client?: { companyName?: string; user?: { name?: string } } | null;
};

export type Tracking = {
  latitude: number | string;
  longitude: number | string;
  updatedAt: string;
};

export type NewDetail = {
  cargoDescription: string;
  unitWeight: string;
  weightUnit: WeightUnit;
  deliveryAddress: string;
  typePackaging: string;
};

export type WeightUnit = "kg" | "t" | "lb" | "qq";

export const weightUnits: { value: WeightUnit; label: string }[] = [
  { value: "kg", label: "Kilogramos (kg)" },
  { value: "t", label: "Toneladas (t)" },
  { value: "lb", label: "Libras (lb)" },
  { value: "qq", label: "Quintales (qq)" },
];

export function parseWeight(value: string): { quantity: string; unit: WeightUnit } {
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*(kg|t|tl|lb|qq)?$/i);
  const unit = match?.[2]?.toLowerCase();
  return {
    quantity: match?.[1] || "1",
    unit: unit === "t" || unit === "tl" ? "t" : unit === "lb" || unit === "qq" ? unit : "kg",
  };
}

export function formatWeight(value: string): string {
  if (!/^(\d+(?:\.\d+)?)\s*(kg|t|tl|lb|qq)?$/i.test(value.trim())) return value;
  const { quantity, unit } = parseWeight(value);
  const number = Number(quantity);
  return Number.isFinite(number)
    ? `${number.toLocaleString("es-NI", { maximumFractionDigits: 2 })} ${unit}`
    : value;
}

export const packagingTypes = [
  { value: "pallet", label: "Pallet" },
  { value: "caja", label: "Caja" },
  { value: "granel", label: "Granel" },
  { value: "contenedor", label: "Contenedor" },
  { value: "bidon", label: "Bidón" },
  { value: "saco", label: "Saco" },
  { value: "atado", label: "Atado" },
  { value: "otro", label: "Otro" },
];

export const orderStatusLabels: Record<string, string> = {
  pendiente_confirmacion: "Pendiente de confirmación",
  entrega_disputada: "Entrega en disputa",
  requiere_nueva_entrega: "Requiere nueva entrega",
  pendiente: "Pendiente",
  esperando_aprobacion: "Cotización recibida",
  aceptado: "Aceptado",
  denegado: "Cotización rechazada",
  en_transito: "En tránsito",
  entregado: "Entregado",
  cancelado: "Cancelado",
  anulado: "Anulado",
};

export type OrderFilter = "all" | "pendiente" | "esperando_aprobacion" | "en_transito" | "entregado" | "cancelled";

export function matchesOrderFilter(status: string, filter: OrderFilter) {
  if (filter === "all") return true;
  if (filter === "cancelled") return ["cancelado", "anulado", "denegado"].includes(status);
  if (filter === "en_transito") return ["en_transito","pendiente_confirmacion","entrega_disputada","requiere_nueva_entrega"].includes(status);
  return status === filter;
}

export { formatDate, formatMoney } from "@/lib/format";

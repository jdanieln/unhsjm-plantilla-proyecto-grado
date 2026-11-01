"use client";

import { PaymentsPanel } from "@/components/ui/PaymentsPanel/PaymentsPanel";
import type { Page, Payment } from "@/features/client/types/client";
import { api } from "../services/operationsApi";

function loadCompanyPayments(page: number, perPage: number, filters: { status?: string; method?: string; search?: string }, signal: AbortSignal) {
  const query = new URLSearchParams({ page: String(page), perPage: String(perPage) });
  if (filters.status) query.set("status", filters.status);
  if (filters.method) query.set("method", filters.method);
  if (filters.search) query.set("search", filters.search);
  return api<Page<Payment>>(`/payments?${query}`, "GET", undefined, signal);
}

export function Payments() {
  return <PaymentsPanel mode="company" load={loadCompanyPayments} />;
}

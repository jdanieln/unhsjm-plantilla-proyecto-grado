import type { IconName } from "@/components/ui/Icon/Icon";

export type Resource =
  | "companies"
  | "clients"
  | "drivers"
  | "trucks"
  | "categories"
  | "users";
export type AdminResource = Exclude<Resource, "trucks">;
export type AdminSection = AdminResource | "dashboard";
export type Row = Record<string, unknown>;
export type PageResult = {
  data: Row[];
  meta: {
    total: number;
    currentPage: number;
    lastPage: number;
    perPage: number;
  };
};
export type Option = { value: string; label: string; companyId?: number };
export type Field = {
  name: string;
  label: string;
  type?: "text" | "email" | "password" | "select" | "file";
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  options?: Option[];
  source?: "companies" | "categories" | "drivers" | "accounts" | "roles";
  createOnly?: boolean;
};
export type ModuleConfig = {
  title: string;
  singular: string;
  description: string;
  icon: IconName;
  id: string;
  name: string;
  columns: { key: string; label: string }[];
  fields: Field[];
};

export function valueAt(row: Row, key: string): unknown {
  return key
    .split(".")
    .reduce<unknown>(
      (value, part) =>
        value && typeof value === "object" ? (value as Row)[part] : undefined,
      row,
    );
}
export function textAt(row: Row, key: string): string {
  const value = valueAt(row, key);
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
}

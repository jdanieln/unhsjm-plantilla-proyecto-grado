import type { AdminResource, ModuleConfig, Option } from "../types/admin";

const options = (values: Record<string, string>): Option[] =>
  Object.entries(values).map(([value, label]) => ({ value, label }));
export const labels: Record<string, string> = {
  platform_admin: "Superadmin",
  client: "Cliente",
  company: "Empresa",
  driver: "Conductor",
  natural: "Persona natural",
  legal: "Persona jurídica",
  activo: "Activo",
  active: "Activo",
  inactivo: "Inactivo",
  inactive: "Inactivo",
  mantenimiento: "Mantenimiento",
  offline: "Desconectado",
  available: "Disponible",
  ontrip: "En viaje",
};
const account = {
  name: "userId",
  label: "Cuenta de acceso",
  type: "select",
  source: "accounts",
} as const;
const photo = {
  name: "photo",
  label: "Fotografía (opcional, máximo 2 MB)",
  type: "file",
} as const;
export const modules: Record<AdminResource, ModuleConfig> = {
  companies: {
    title: "Empresas",
    singular: "empresa",
    description: "Conecta y administra las empresas que mueven tu plataforma.",
    icon: "building",
    id: "idCompany",
    name: "businessName",
    columns: [
      { key: "businessName", label: "Empresa" },
      { key: "ruc", label: "RUC" },
      { key: "user.email", label: "Cuenta asociada" },
    ],
    fields: [
      {
        name: "businessName",
        label: "Razón social",
        required: true,
        maxLength: 255,
      },
      { name: "ruc", label: "RUC", required: true, maxLength: 20 },
      account,
      photo,
    ],
  },
  clients: {
    title: "Clientes",
    singular: "cliente",
    description: "Las personas y negocios que confían sus envíos a TravelDLS.",
    icon: "users",
    id: "idClient",
    name: "companyName",
    columns: [
      { key: "companyName", label: "Cliente" },
      { key: "ruc", label: "Identificación / RUC" },
      { key: "typeClient", label: "Tipo" },
      { key: "address", label: "Dirección" },
    ],
    fields: [
      {
        name: "companyName",
        label: "Nombre o razón social",
        required: true,
        maxLength: 255,
      },
      {
        name: "ruc",
        label: "Identificación / RUC",
        required: true,
        maxLength: 20,
      },
      { name: "address", label: "Dirección", required: true },
      {
        name: "typeClient",
        label: "Tipo de cliente",
        type: "select",
        required: true,
        options: options({ natural: labels.natural, legal: labels.legal }),
      },
      account,
      photo,
    ],
  },
  drivers: {
    title: "Conductores",
    singular: "conductor",
    description:
      "Gestiona sus perfiles, disponibilidad y vínculo con las empresas.",
    icon: "user",
    id: "idDriver",
    name: "user.name",
    columns: [
      { key: "user.name", label: "Conductor" },
      { key: "license", label: "Licencia" },
      { key: "company.businessName", label: "Empresa" },
      { key: "status", label: "Estado" },
    ],
    fields: [
      account,
      {
        name: "idCompany",
        label: "Empresa",
        type: "select",
        source: "companies",
        required: true,
      },
      { name: "license", label: "Licencia", required: true, minLength: 5 },
      {
        name: "passport",
        label: "Identificación / pasaporte",
        required: true,
        minLength: 5,
      },
      {
        name: "status",
        label: "Estado",
        type: "select",
        required: true,
        options: options({
          offline: labels.offline,
          available: labels.available,
          ontrip: labels.ontrip,
          inactive: labels.inactive,
        }),
      },
      photo,
    ],
  },
  categories: {
    title: "Tipos de camión",
    singular: "tipo de camión",
    description:
      "Define las opciones de transporte que las empresas podrán elegir para su flota.",
    icon: "tag",
    id: "idCategory",
    name: "nameCategory",
    columns: [
      { key: "nameCategory", label: "Categoría" },
      { key: "status", label: "Estado" },
      { key: "createdAt", label: "Fecha de creación" },
    ],
    fields: [
      {
        name: "nameCategory",
        label: "Nombre de la categoría",
        required: true,
        minLength: 2,
        maxLength: 150,
      },
      {
        name: "status",
        label: "Estado",
        type: "select",
        required: true,
        options: options({
          activo: "Activo",
          inactivo: "Inactivo",
          mantenimiento: "Mantenimiento",
        }),
      },
    ],
  },
  users: {
    title: "Usuarios",
    singular: "usuario",
    description:
      "Crea las cuentas de acceso y asigna el rol que necesita cada persona.",
    icon: "shield",
    id: "idUser",
    name: "name",
    columns: [
      { key: "name", label: "Usuario" },
      { key: "email", label: "Correo electrónico" },
      { key: "role.name", label: "Rol" },
      { key: "createdAt", label: "Fecha de registro" },
    ],
    fields: [
      {
        name: "name",
        label: "Nombre completo",
        required: true,
        maxLength: 255,
      },
      {
        name: "email",
        label: "Correo electrónico",
        type: "email",
        required: true,
      },
      {
        name: "password",
        label: "Contraseña inicial",
        type: "password",
        required: true,
        minLength: 8,
      },
      {
        name: "roleId",
        label: "Rol de acceso",
        type: "select",
        source: "roles",
        required: true,
      },
    ],
  },
};
export function isResource(value: string): value is AdminResource {
  return Object.hasOwn(modules, value);
}

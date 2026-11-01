export const USER_ROLES = [
  "platform_admin",
  "client",
  "driver",
  "company",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export type LoginCredentials = {
  email: string;
  password: string;
};

export type SignupData = LoginCredentials & {
  name: string;
};

export type SessionUser = {
  idUser: number;
  email: string;
  name: string;
  role: UserRole;
  idClient: number | null;
  idCompany: number | null;
  idDriver: number | null;
};

export function isUserRole(value: unknown): value is UserRole {
  return USER_ROLES.includes(value as UserRole);
}

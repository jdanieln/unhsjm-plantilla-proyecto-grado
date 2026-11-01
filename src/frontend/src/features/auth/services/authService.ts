import {
  isUserRole,
  type LoginCredentials,
  type SessionUser,
  type SignupData,
} from "@/features/auth/types/auth";

const DEFAULT_API_BASE_URL = "http://localhost:3333";
const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_BASE_URL
).replace(/\/+$/, "");

type ErrorPayload = {
  message?: unknown;
  errors?: unknown;
};

export class AuthRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AuthRequestError";
  }
}

const translatedMessages: Record<string, string> = {
  "Invalid email or password.": "El correo o la contraseña no son correctos.",
  "Email or Name already exists.":
    "Ya existe una cuenta con ese correo o nombre.",
  "Registration failed": "No se pudo crear la cuenta.",
  "Login failed": "No se pudo iniciar sesión.",
  Unauthorized: "La sesión no es válida o ha expirado.",
};

function translateMessage(message: string): string {
  return translatedMessages[message] ?? message;
}

function extractErrorMessage(payload: ErrorPayload | null, status: number) {
  if (typeof payload?.message === "string" && payload.message.trim()) {
    return translateMessage(payload.message.trim());
  }

  if (Array.isArray(payload?.errors)) {
    const messages = payload.errors
      .map((error) => {
        if (!error || typeof error !== "object") return null;
        const message = (error as { message?: unknown }).message;
        return typeof message === "string" ? message : null;
      })
      .filter((message): message is string => Boolean(message));

    if (messages.length) return messages.join(" ");
  }

  if (status === 401) return "El correo o la contraseña no son correctos.";
  if (status === 422) return "Revisa los datos ingresados e inténtalo de nuevo.";
  return "Ocurrió un problema al comunicarse con el servidor.";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      cache: "no-store",
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new AuthRequestError(
      "No se pudo conectar con el servidor. Comprueba que el backend esté encendido.",
      0,
    );
  }

  const payload = (await response.json().catch(() => null)) as T | ErrorPayload | null;

  if (!response.ok) {
    throw new AuthRequestError(
      extractErrorMessage(payload as ErrorPayload | null, response.status),
      response.status,
    );
  }

  return payload as T;
}

function parseSessionUser(payload: unknown): SessionUser {
  if (!payload || typeof payload !== "object") {
    throw new AuthRequestError("El servidor devolvió una sesión no válida.", 500);
  }

  const user = payload as Partial<SessionUser>;
  if (
    typeof user.idUser !== "number" ||
    typeof user.name !== "string" ||
    typeof user.email !== "string" ||
    !isUserRole(user.role)
  ) {
    throw new AuthRequestError("El servidor devolvió una sesión no válida.", 500);
  }

  return {
    idUser: user.idUser,
    name: user.name,
    email: user.email,
    role: user.role,
    idClient: user.idClient ?? null,
    idCompany: user.idCompany ?? null,
    idDriver: user.idDriver ?? null,
  };
}

export async function getCurrentUser(): Promise<SessionUser> {
  return parseSessionUser(await request<unknown>("/api/auth/me"));
}

export async function logout(): Promise<void> {
  await request("/api/auth/logout", { method: "POST" });
}

export async function login(credentials: LoginCredentials): Promise<SessionUser> {
  await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });

  return getCurrentUser();
}

export async function signup(data: SignupData): Promise<SessionUser> {
  await request("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(data),
  });

  return getCurrentUser();
}

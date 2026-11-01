"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/Icon/Icon";
import { AnimatedIcon } from "@/components/ui/AnimatedIcon/AnimatedIcon";
import { SessionTransition } from "@/components/ui/SessionTransition/SessionTransition";
import { waitForSessionTransition } from "@/components/ui/SessionTransition/sessionTransitionTiming";
import {
  getCurrentUser,
  logout,
  AuthRequestError,
} from "@/features/auth/services/authService";
import type { SessionUser } from "@/features/auth/types/auth";
import { modules } from "../../config/modules";
import { ThemeToggle } from "@/components/ui/ThemeToggle/ThemeToggle";
import styles from "./AdminShell.module.css";

const SessionContext = createContext<SessionUser | null>(null);
export function useAdminUser() {
  return useContext(SessionContext);
}

const navigation: { path: string; label: string; icon: IconName }[] = [
  { path: "dashboard", label: "Vista general", icon: "grid" },
  { path: "deliveries", label: "Revisión de entregas", icon: "box" },
  ...Object.entries(modules).map(([path, item]) => ({
    path,
    label: item.title,
    icon: item.icon,
  })),
];

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [menu, setMenu] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!menu) return;
    const previous = document.body.style.overflow;
    const focused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    sidebarRef.current?.querySelector<HTMLElement>("a,button")?.focus();
    function keyboard(event: KeyboardEvent) {
      if (event.key === "Escape") setMenu(false);
      if (event.key !== "Tab") return;
      const items = sidebarRef.current?.querySelectorAll<HTMLElement>(
        "a,button:not(:disabled)",
      );
      if (!items?.length) return;
      const first = items[0],
        last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    const resized = () => {
      if (window.innerWidth > 800) setMenu(false);
    };
    window.addEventListener("keydown", keyboard);
    window.addEventListener("resize", resized);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", keyboard);
      window.removeEventListener("resize", resized);
      focused?.focus();
    };
  }, [menu]);

  useEffect(() => {
    let active = true;
    async function checkSession() {
      try {
        const session = await getCurrentUser();
        if (!active) return;
        if (session.role !== "platform_admin") {
          setError(
            "Esta sección está disponible únicamente para superadministradores.",
          );
          setUser(null);
          return;
        }
        setUser(session);
        setError("");
      } catch (cause) {
        if (!active) return;
        setUser(null);
        if (cause instanceof AuthRequestError && cause.status === 401)
          router.replace("/");
        else
          setError(
            cause instanceof Error
              ? cause.message
              : "No se pudo verificar tu sesión.",
          );
      }
    }
    void checkSession();
    const expired = () => {
      setUser(null);
      router.replace("/");
    };
    const visible = () => {
      if (document.visibilityState === "visible") void checkSession();
    };
    window.addEventListener("admin-session-expired", expired);
    document.addEventListener("visibilitychange", visible);
    return () => {
      active = false;
      window.removeEventListener("admin-session-expired", expired);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [attempt, router]);

  async function signOut() {
    setLeaving(true);
    setMenu(false);
    const transitionStartedAt = Date.now();
    try {
      await logout();
      await waitForSessionTransition(transitionStartedAt);
      setUser(null);
      router.replace("/");
      return;
    } catch (cause) {
      await waitForSessionTransition(transitionStartedAt);
      if (cause instanceof AuthRequestError && cause.status === 401) {
        setUser(null);
        router.replace("/");
        return;
      }
      setError("No se pudo cerrar la sesión. Inténtalo de nuevo.");
      setLeaving(false);
    }
  }

  const current = navigation.find((item) => pathname === `/admin/${item.path}`);
  if (!user)
    return (
      <main className={styles.gate}>
        <Icon name="shield" size={32} />
        <h1>{error ? "No pudimos abrir tu panel" : "Preparando tu espacio"}</h1>
        <p role={error ? "alert" : "status"}>
          {error || "Comprobando tu sesión de administrador…"}
        </p>
        {error && (
          <div>
            <button
              onClick={() => {
                setError("");
                setAttempt(attempt + 1);
              }}
            >
              Reintentar
            </button>
            <Link href="/">Volver al inicio</Link>
          </div>
        )}
      </main>
    );

  return (
    <SessionContext.Provider value={user}>
      <SessionTransition active={leaving} mode="logout" />
      <div className={styles.shell}>
        <a className={styles.skip} href="#admin-content">
          Ir al contenido
        </a>
        {menu && (
          <button
            className={styles.backdrop}
            aria-label="Cerrar navegación"
            onClick={() => setMenu(false)}
          />
        )}
        <aside
          ref={sidebarRef}
          id="admin-navigation"
          className={`${styles.sidebar} ${menu ? styles.open : ""}`}
        >
          <Link
            href="/admin/dashboard"
            className={styles.brand}
            onClick={() => setMenu(false)}
          >
            <Image
              src="/images/traveldls-emblem.png"
              width={48}
              height={48}
              alt=""
            />
            <span>
              TRAVEL<span>DLS</span>
              <small>CONTROL Y CONEXIÓN</small>
            </span>
          </Link>
          <div className={styles.workspace}>
            <span className={styles.workspaceIcon}>
              <Icon name="shield" size={18} />
            </span>
            <div>
              Administración<small>Espacio de superadmin</small>
            </div>
            <span className={styles.dot} />
          </div>
          <p className={styles.navLabel}>PRINCIPAL</p>
          <nav aria-label="Administración">
            {navigation.map((item) => (
              <Link
                key={item.path}
                href={`/admin/${item.path}`}
                aria-current={
                  pathname === `/admin/${item.path}` ? "page" : undefined
                }
                className={styles.navLink}
                onClick={() => setMenu(false)}
              >
                <AnimatedIcon name={item.icon} size={19} motion="nav" />
                <span>{item.label}</span>
                {pathname === `/admin/${item.path}` && (
                  <span className={styles.activeMark} />
                )}
              </Link>
            ))}
          </nav>
          <div className={styles.sidebarBottom}>
            <div className={styles.sidebarNote}>
              <Icon name="route" />
              <p>
                Cada conexión cuenta.
                <small>Tu operación, bajo tu mirada.</small>
              </p>
            </div>
            <button
              className={styles.signOut}
              onClick={signOut}
              disabled={leaving}
            >
              <Icon name="logout" size={18} />
              {leaving ? "Cerrando sesión…" : "Cerrar sesión"}
            </button>
          </div>
        </aside>
        <div className={styles.workspaceMain}>
          <header className={styles.topbar}>
            <button
              className={styles.menuButton}
              onClick={() => setMenu(!menu)}
              aria-label={menu ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={menu}
              aria-controls="admin-navigation"
            >
              <Icon name={menu ? "close" : "menu"} />
            </button>
            <div className={styles.breadcrumb}>
              <span>Administración</span>
              <Icon name="chevron" size={12} />
              <strong key={pathname} className={styles.breadcrumbCurrent}>
                {current?.label || "Panel"}
              </strong>
            </div>
            <ThemeToggle />
            <div className={styles.profile}>
              <span className={styles.avatar}>
                {user.name.slice(0, 2).toUpperCase()}
              </span>
              <div>
                {user.name}
                <small>Superadministrador</small>
              </div>
            </div>
          </header>
          <main
            id="admin-content"
            key={pathname}
            className={`${styles.content} ${current?.path !== "dashboard" ? styles.listContent : ""}`}
            tabIndex={-1}
          >
            {error && (
              <p role="alert" className={styles.error}>
                {error}
              </p>
            )}
            {children}
          </main>
          <footer className={styles.footer}>
            <span>© {new Date().getFullYear()} TravelDLS</span>
            <span>Tu carga y tu empresa. Nuestro compromiso.</span>
          </footer>
        </div>
      </div>
    </SessionContext.Provider>
  );
}

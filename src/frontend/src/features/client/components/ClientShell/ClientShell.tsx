"use client";
import { DeliveryInbox } from "@/features/deliveries/DeliveryInbox";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/Icon/Icon";
import { AnimatedIcon } from "@/components/ui/AnimatedIcon/AnimatedIcon";
import { SessionTransition } from "@/components/ui/SessionTransition/SessionTransition";
import { waitForSessionTransition } from "@/components/ui/SessionTransition/sessionTransitionTiming";
import { getCurrentUser, logout, AuthRequestError } from "@/features/auth/services/authService";
import type { SessionUser } from "@/features/auth/types/auth";
import { ThemeToggle } from "@/components/ui/ThemeToggle/ThemeToggle";
import styles from "./ClientShell.module.css";

const ClientContext = createContext<{ user: SessionUser; refresh: () => Promise<void> } | null>(null);
export function useClientSession() {
  const session = useContext(ClientContext);
  if (!session) throw new Error("La sesión de cliente no está disponible.");
  return session;
}

const navigation: { path: string; label: string; icon: IconName }[] = [
  { path: "dashboard", label: "Vista general", icon: "grid" },
  { path: "orders", label: "Mis pedidos", icon: "box" },
  { path: "payments", label: "Pagos", icon: "tag" },
  { path: "profile", label: "Mi perfil", icon: "user" },
];

export function ClientShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  async function refresh() {
    const current = await getCurrentUser();
    if (current.role !== "client") throw new Error("Esta sección es para clientes.");
    setUser(current);
  }

  useEffect(() => {
    let active = true;
    getCurrentUser().then((current) => {
      if (!active) return;
      if (current.role !== "client") {
        setError("Esta sección está disponible únicamente para clientes.");
      } else {
        setUser(current);
        setError("");
      }
    }).catch((cause) => {
      if (!active) return;
      if (cause instanceof AuthRequestError && cause.status === 401) router.replace("/");
      else setError(cause instanceof Error ? cause.message : "No se pudo comprobar tu sesión.");
    });
    const expired = () => { setUser(null); router.replace("/"); };
    window.addEventListener("client-session-expired", expired);
    return () => { active = false; window.removeEventListener("client-session-expired", expired); };
  }, [attempt, router]);

  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    const focused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    navRef.current?.querySelector<HTMLElement>("a")?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
      if (event.key !== "Tab") return;
      const items = navRef.current?.querySelectorAll<HTMLElement>("a,button:not(:disabled)");
      if (!items?.length) return;
      if (event.shiftKey && document.activeElement === items[0]) {
        event.preventDefault(); items[items.length - 1].focus();
      } else if (!event.shiftKey && document.activeElement === items[items.length - 1]) {
        event.preventDefault(); items[0].focus();
      }
    };
    const resize = () => { if (window.innerWidth > 800) setMenuOpen(false); };
    window.addEventListener("keydown", keyboard);
    window.addEventListener("resize", resize);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", keyboard);
      window.removeEventListener("resize", resize);
      focused?.focus();
    };
  }, [menuOpen]);

  async function signOut() {
    if (leaving) return;
    setMenuOpen(false);
    setLeaving(true);
    const started = Date.now();
    try {
      await logout();
      await waitForSessionTransition(started);
      setUser(null);
      router.replace("/");
    } catch (cause) {
      await waitForSessionTransition(started);
      if (cause instanceof AuthRequestError && cause.status === 401) {
        setUser(null); router.replace("/");
      } else {
        setError("No se pudo cerrar la sesión. Inténtalo nuevamente.");
        setLeaving(false);
      }
    }
  }

  if (!user) return <main className={styles.gate}>
    <Image src="/images/traveldls-emblem.png" width={92} height={92} alt="" />
    <h1>{error ? "No pudimos abrir tu espacio" : "Preparando tu espacio"}</h1>
    <p role={error ? "alert" : "status"}>{error || "Comprobando tu sesión de cliente…"}</p>
    {error && <div className={styles.gateActions}>
      <button onClick={() => { setError(""); setAttempt((value) => value + 1); }}>Reintentar</button>
      <Link href="/">Volver al inicio</Link>
    </div>}
  </main>;

  const current = navigation.find((item) => pathname === `/client/${item.path}`);
  return <ClientContext.Provider value={{ user, refresh }}>
    <SessionTransition active={leaving} mode="logout" />
    <div className={styles.shell}>
      <a className={styles.skip} href="#client-content">Ir al contenido</a>
      {menuOpen && <button className={styles.backdrop} aria-label="Cerrar navegación" onClick={() => setMenuOpen(false)} />}
      <aside id="client-navigation" ref={navRef} className={`${styles.sidebar} ${menuOpen ? styles.open : ""}`}>
        <Link className={styles.brand} href="/client/dashboard" onClick={() => setMenuOpen(false)}>
          <Image src="/images/traveldls-emblem.png" width={48} height={48} alt="" />
          <span>TRAVEL<span>DLS</span><small>TU PEDIDO, NUESTRA MIRADA</small></span>
        </Link>
        <div className={styles.workspace}><span className={styles.workspaceIcon}><Icon name="box" size={18} /></span>
          <div>Espacio de cliente<small>Tu próximo destino empieza aquí</small></div><span className={styles.dot} /></div>
        <p className={styles.navLabel}>TU ESPACIO</p>
        <nav aria-label="Cliente">{navigation.map((item) => <Link key={item.path} href={`/client/${item.path}`}
          aria-current={pathname === `/client/${item.path}` ? "page" : undefined}
          className={styles.navLink} onClick={() => setMenuOpen(false)}>
          <AnimatedIcon name={item.icon} size={19} motion="nav" /><span>{item.label}</span>
          {pathname === `/client/${item.path}` && <span className={styles.activeMark} />}
        </Link>)}</nav>
        <div className={styles.sidebarBottom}>
          <div className={styles.sidebarNote}><Icon name="route" /><p>Cada destino cuenta.<small>Tu carga, bajo nuestra mirada.</small></p></div>
          <button className={styles.signOut} onClick={signOut} disabled={leaving}><Icon name="logout" size={18} />Cerrar sesión</button>
        </div>
      </aside>
      <div className={styles.workspaceMain}>
        <header className={styles.topbar}>
          <button className={styles.menuButton} onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"} aria-expanded={menuOpen} aria-controls="client-navigation"><Icon name={menuOpen ? "close" : "menu"} /></button>
          <div className={styles.breadcrumb}><span>Mi espacio</span><Icon name="chevron" size={12} /><strong key={pathname}>{current?.label || "Cliente"}</strong></div>
          <ThemeToggle />
            <Link className={styles.profile} href="/client/profile" aria-label="Ir a mi perfil"><span className={styles.avatar}>{user.name.slice(0, 2).toUpperCase()}</span><span>{user.name}<small>Cliente</small></span></Link>
        </header>
        <main id="client-content" key={pathname} className={styles.content} tabIndex={-1}>
          {error && <p className={styles.alert} role="alert">{error}</p>}
          <DeliveryInbox />
          {children}
        </main>
        <footer className={styles.footer}><span>© {new Date().getFullYear()} TravelDLS</span><span>Tu carga y tu empresa. Nuestro compromiso.</span></footer>
      </div>
    </div>
  </ClientContext.Provider>;
}

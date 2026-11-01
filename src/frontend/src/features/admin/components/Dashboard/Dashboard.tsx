"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon/Icon";
import { ActionButton } from "@/components/ui/Workspace/Workspace";
import { AnimatedIcon } from "@/components/ui/AnimatedIcon/AnimatedIcon";
import { DashboardStatCard } from "@/components/ui/DashboardStatCard/DashboardStatCard";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { useAdminUser } from "../AdminShell/AdminShell";
import { modules } from "../../config/modules";
import { allRows, listResource } from "../../services/adminApi";
import { textAt, type AdminResource, type Row } from "../../types/admin";
import styles from "../../styles/Admin.module.css";

const resources: AdminResource[] = [
  "companies",
  "clients",
  "drivers",
  "categories",
];
type Snapshot = {
  totals: Record<string, number>;
  companies: Row[];
  drivers: Row[];
};

export function Dashboard() {
  const user = useAdminUser();
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const refreshSilently = useCallback(() => setVersion(value => value + 1), []);
  useAutoRefresh(refreshSilently, !loading);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const [pages, drivers] = await Promise.all([
          Promise.all(
            resources.map((resource) =>
              listResource(
                resource,
                1,
                "",
                controller.signal,
                resource === "companies" ? 5 : 1,
              ),
            ),
          ),
          allRows("drivers", controller.signal),
        ]);
        if (!controller.signal.aborted) {
          setData({
            totals: Object.fromEntries(
              resources.map((resource, index) => [
                resource,
                Number(pages[index].meta.total),
              ]),
            ),
            companies: pages[0].data,
            drivers,
          });
          setError("");
        }
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "No se pudo cargar el resumen.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [version]);
  const statuses = [
    { value: "available", label: "Disponibles" },
    { value: "ontrip", label: "En viaje" },
    { value: "offline", label: "Desconectados" },
    { value: "inactive", label: "Inactivos" },
  ];
  return (
    <>
      <div className={styles.pageHeading}>
        <div>
          <p className={styles.eyebrow}>TODO CONECTADO. TODO BAJO CONTROL.</p>
          <h1>Vista general</h1>
          <p>
            Una mirada a las personas y empresas que hacen posible cada destino.
          </p>
        </div>
        <button
          className={`${styles.secondary} ${loading ? styles.refreshing : ""}`}
          disabled={loading}
          onClick={refreshSilently}
        >
          <Icon name="refresh" size={16} />
          Actualizar
        </button>
      </div>
      <section className={styles.welcome}>
        <div>
          <span className={styles.welcomeLabel}>
            <span /> TU CENTRO DE OPERACIONES
          </span>
          <h2>
            Hola, {user?.name.split(" ")[0] || "administrador"}.<br />
            Hagamos que todo siga en movimiento.
          </h2>
          <p>
            Gestiona las conexiones, organiza tu plataforma y acompaña cada
            nuevo comienzo.
          </p>
          <Link href="/admin/users" className={styles.primary}>
            Gestionar accesos
            <Icon name="arrow" size={17} />
          </Link>
        </div>
        <div className={styles.welcomeArt} aria-hidden="true">
          <AnimatedIcon name="route" size={110} />
          <span>TRAVELDLS / CONECTAMOS DESTINOS</span>
        </div>
      </section>
      {error && !data ? (
        <div className={`${styles.card} ${styles.empty}`} role="alert">
          <Icon name="help" size={30} />
          <h2>No pudimos cargar el resumen</h2>
          <p>{error}</p>
          <button
            className={styles.secondary}
            onClick={refreshSilently}
          >
            Reintentar
          </button>
        </div>
      ) : (
        <>
          {error && data && <p className={styles.refreshWarning} role="status">No se pudo actualizar el resumen. Se muestran los últimos datos disponibles.</p>}
          <div className={styles.stats} aria-busy={loading}>
            {resources.map((resource) => <DashboardStatCard
              key={resource}
              href={`/admin/${resource}`}
              icon={modules[resource].icon}
              value={loading ? "—" : data?.totals[resource].toLocaleString("es-NI") ?? "—"}
              label={modules[resource].title}
              hint="Ver y administrar"
            />)}
          </div>
          {loading ? (
            <div className={styles.empty} role="status">
              <span className={styles.loadingDot} />
              <p>Actualizando la información de tu plataforma…</p>
            </div>
          ) : (
            data && (
              <div className={styles.dashboardGrid}>
                <section className={styles.card}>
                  <div className={styles.cardHeading}>
                    <div>
                      <h2>Empresas de la plataforma</h2>
                      <p>Las conexiones que nos mueven.</p>
                    </div>
                    <ActionButton href="/admin/companies" icon="arrow" iconPlacement="after">
                      Ver todas
                    </ActionButton>
                  </div>
                  <div className={styles.companyList}>
                    {data.companies.length ? (
                      data.companies.map((company) => (
                        <Link
                          href="/admin/companies"
                          key={textAt(company, "idCompany")}
                          className={styles.companyRow}
                        >
                          <span className={styles.entityIcon}>
                            <Icon name="building" size={19} />
                          </span>
                          <div>
                            <strong>{textAt(company, "businessName")}</strong>
                            <small>
                              {textAt(company, "user.email") ||
                                `RUC ${textAt(company, "ruc")}`}
                            </small>
                          </div>
                          <Icon name="chevron" size={15} />
                        </Link>
                      ))
                    ) : (
                      <div className={styles.empty}>
                        <p>Aún no hay empresas registradas.</p>
                        <Link
                          className={styles.secondary}
                          href="/admin/companies"
                        >
                          Agregar empresa
                        </Link>
                      </div>
                    )}
                  </div>
                </section>
                <section className={styles.card}>
                  <div className={styles.cardHeading}>
                    <div>
                      <h2>Conductores en tu red</h2>
                      <p>Disponibilidad actual de los perfiles.</p>
                    </div>
                    <Icon name="user" size={21} />
                  </div>
                  <div className={styles.availability}>
                    {statuses.map((status) => {
                      const count = data.drivers.filter(
                        (driver) => driver.status === status.value,
                      ).length;
                      return (
                        <div key={status.value}>
                          <div>
                            <span className={styles.statusLabel}>
                              <i data-state={status.value} />
                              {status.label}
                            </span>
                            <strong>{count}</strong>
                          </div>
                          <div className={styles.bar}>
                            <span
                              style={{
                                width: `${data.drivers.length ? (count / data.drivers.length) * 100 : 0}%`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    {!data.drivers.length && (
                      <p className={styles.footnote}>
                        Registra conductores para ver su disponibilidad.
                      </p>
                    )}
                    <Link href="/admin/drivers" className={styles.textButton}>
                      Administrar conductores
                      <Icon name="arrow" size={15} />
                    </Link>
                  </div>
                </section>
              </div>
            )
          )}
        </>
      )}
      <div className={styles.quickLinks}>
        <Link href="/admin/users">
          <Icon name="shield" size={22} />
          <div>
            <strong>Personas y permisos</strong>
            <span>El acceso correcto para cada rol.</span>
          </div>
          <Icon name="arrow" size={17} />
        </Link>
        <Link href="/admin/categories">
          <Icon name="tag" size={22} />
          <div>
            <strong>Una flota organizada</strong>
            <span>Administra las categorías de transporte.</span>
          </div>
          <Icon name="arrow" size={17} />
        </Link>
      </div>
    </>
  );
}

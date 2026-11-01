"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { Icon } from "@/components/ui/Icon/Icon";
import { Select } from "@/components/ui/Select/Select";
import { TimedNotice } from "@/components/ui/TimedNotice/TimedNotice";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { modules, labels } from "../../config/modules";
import { listResource, deleteResource } from "../../services/adminApi";
import {
  textAt,
  type AdminResource,
  type Row,
  type PageResult,
} from "../../types/admin";
import { ResourceForm } from "../ResourceForm/ResourceForm";
import { AdminModal } from "../AdminModal/AdminModal";
import styles from "../../styles/Admin.module.css";

export function displayValue(row: Row, key: string) {
  const value = textAt(row, key);
  if (!value) return "Sin asignar";
  if (key === "createdAt") {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "—"
      : date.toLocaleDateString("es-NI");
  }
  return ["status", "role.name", "typeClient"].includes(key)
    ? labels[value] || value
    : value;
}
export function ResourcePanel({ resource }: { resource: AdminResource }) {
  const config = modules[resource];
  const [data, setData] = useState<PageResult | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [draftSearch, setDraftSearch] = useState("");
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<{ message: string; tone?: "success" | "danger" } | null>(null);
  const [form, setForm] = useState<{ record?: Row } | null>(null);
  const [detail, setDetail] = useState<Row | null>(null);
  const [removing, setRemoving] = useState<Row | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const requestKey = JSON.stringify([resource, page, perPage, search]);
  const lastRequestKey = useRef<string | null>(null);
  const refreshSilently = useCallback(() => setVersion(value => value + 1), []);
  useAutoRefresh(refreshSilently, !form && !removing && !deleteBusy);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      if (lastRequestKey.current !== requestKey) {
        lastRequestKey.current = requestKey;
        setLoading(true);
        setData(null);
        setError("");
      }
      try {
        const result = await listResource(
          resource,
          page,
          search,
          controller.signal,
          perPage,
        );
        if (!controller.signal.aborted) {
          if (page > result.meta.lastPage && result.meta.lastPage > 0)
            setPage(result.meta.lastPage);
          else {
            setData(result);
            setDetail(current => current ? result.data.find(row => textAt(row, config.id) === textAt(current, config.id)) || current : null);
            setError("");
          }
        }
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "No se pudieron cargar los datos.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [resource, page, search, version, perPage, requestKey, config.id]);

  function find(event: FormEvent) {
    event.preventDefault();
    setSearch(draftSearch.trim());
    setPage(1);
  }
  async function remove() {
    if (!removing || deleteBusy) return;
    setDeleteBusy(true);
    setDeleteError("");
    try {
      await deleteResource(resource, textAt(removing, config.id));
      setRemoving(null);
      setNotice({ message: "Registro eliminado correctamente.", tone: "danger" });
      refreshSilently();
    } catch (cause) {
      setDeleteError(
        cause instanceof Error ? cause.message : "No se pudo eliminar.",
      );
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className={styles.resourcePage}>
      <div className={styles.pageHeading}>
        <div>
          <p className={styles.eyebrow}>TU PLATAFORMA, EN ORDEN</p>
          <h1>
            {config.title}
            <span className={styles.count}>{data?.meta.total ?? "—"}</span>
          </h1>
          <p>{config.description}</p>
        </div>
        <button className={styles.primary} onClick={() => setForm({})}>
          <Icon name="plus" size={17} />
          Crear {config.singular}
        </button>
      </div>
      {notice && <TimedNotice message={notice.message} tone={notice.tone} onDismiss={() => setNotice(null)} />}
      {error && data && <p className={styles.refreshWarning} role="status">No se pudo actualizar el listado. Se muestran los últimos datos disponibles.</p>}
      <section
        className={`${styles.card} ${styles.listCard}`}
        aria-label={`Listado de ${config.title.toLowerCase()}`}
      >
        <div className={styles.toolbar}>
          <form className={styles.search} onSubmit={find}>
            <Icon name="search" size={18} />
            <input
              aria-label={`Buscar ${config.title.toLowerCase()}`}
              placeholder={`Buscar ${config.title.toLowerCase()}…`}
              value={draftSearch}
              onChange={(event) => setDraftSearch(event.target.value)}
            />
            <button type="submit">Buscar</button>
          </form>
          <div className={styles.toolbarActions}>
            {search && (
              <button
                className={styles.textButton}
                onClick={() => {
                  setSearch("");
                  setDraftSearch("");
                  setPage(1);
                }}
              >
                Limpiar
              </button>
            )}
            <button
              className={`${styles.iconButton} ${loading ? styles.refreshing : ""}`}
              onClick={refreshSilently}
              disabled={loading}
              aria-label="Actualizar listado"
            >
              <Icon name="refresh" size={18} />
            </button>
          </div>
        </div>
        {loading ? (
          <div className={styles.empty} role="status">
            <span className={styles.loadingDot} />
            <h2>Cargando {config.title.toLowerCase()}</h2>
            <p>Estamos consultando la información más reciente.</p>
          </div>
        ) : error && !data ? (
          <div className={styles.empty} role="alert">
            <Icon name="help" size={30} />
            <h2>No pudimos cargar los datos</h2>
            <p>{error}</p>
            <button
              className={styles.secondary}
              onClick={refreshSilently}
            >
              Reintentar
            </button>
          </div>
        ) : !data?.data.length ? (
          <div className={styles.empty}>
            <Icon name={config.icon} size={32} />
            <h2>
              {search
                ? "No encontramos coincidencias"
                : `Aún no hay ${config.title.toLowerCase()}`}
            </h2>
            <p>
              {search
                ? "Prueba con otro término o limpia la búsqueda."
                : "Empieza agregando el primer registro a tu plataforma."}
            </p>
            <button
              className={styles.secondary}
              onClick={() =>
                search ? (setSearch(""), setDraftSearch("")) : setForm({})
              }
            >
              {search ? "Ver todos" : `Crear ${config.singular}`}
            </button>
          </div>
        ) : (
          <>
            <div
              className={styles.tableScroll}
              tabIndex={0}
              role="region"
              aria-label="Tabla desplazable"
            >
              <table className={styles.table}>
                <thead>
                  <tr>
                    {config.columns.map((column) => (
                      <th key={column.key}>{column.label}</th>
                    ))}
                    <th className={styles.actionsHeading}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((row) => (
                    <tr key={textAt(row, config.id)}>
                      {config.columns.map((column, index) => (
                        <td key={column.key}>
                          {index === 0 ? (
                            <div className={styles.entity}>
                              <span className={styles.entityIcon}>
                                {textAt(row, "photoUrl") ? (
                                  <Image
                                    src={textAt(row, "photoUrl")}
                                    alt=""
                                    width={34}
                                    height={34}
                                    unoptimized
                                  />
                                ) : (
                                  <Icon name={config.icon} size={17} />
                                )}
                              </span>
                              <div>
                                <strong>
                                  {textAt(row, column.key) ||
                                    (resource === "drivers"
                                      ? `Conductor #${textAt(row, config.id)}`
                                      : "Sin nombre")}
                                </strong>
                                <small>
                                  ID {textAt(row, config.id).padStart(4, "0")}
                                </small>
                              </div>
                            </div>
                          ) : column.key === "status" ||
                            column.key === "role.name" ||
                            column.key === "typeClient" ? (
                            <span
                              className={styles.badge}
                              data-state={textAt(row, column.key)}
                            >
                              {displayValue(row, column.key)}
                            </span>
                          ) : (
                            displayValue(row, column.key)
                          )}
                        </td>
                      ))}
                      <td>
                        <div className={styles.rowActions}>
                          <button
                            className={styles.iconButton}
                            aria-label={`Ver ${textAt(row, config.name) || config.singular}`}
                            onClick={() => setDetail(row)}
                          >
                            <Icon name="eye" size={17} />
                          </button>
                          {resource !== "users" && (
                            <>
                              <button
                                className={styles.iconButton}
                                aria-label={`Editar ${textAt(row, config.name) || config.singular}`}
                                onClick={() => setForm({ record: row })}
                              >
                                <Icon name="edit" size={17} />
                              </button>
                              <button
                                className={`${styles.iconButton} ${styles.deleteButton}`}
                                aria-label={`Eliminar ${textAt(row, config.name) || config.singular}`}
                                onClick={() => {
                                  setDeleteError("");
                                  setRemoving(row);
                                }}
                              >
                                <Icon name="trash" size={17} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        <div className={styles.pagination}>
          <div className={styles.pageSize}>
            <span id="page-size-label">Por página</span>
            <Select
              label="Elementos por página"
              value={String(perPage)}
              options={[10, 25, 50, 100].map((size) => ({
                value: String(size),
                label: String(size),
              }))}
              onChange={(value) => {
                setPerPage(Number(value));
                setPage(1);
              }}
            />
          </div>
          <span>
            {loading
              ? "Cargando…"
              : error && !data
                ? "—"
                : `${data?.data.length ? (page - 1) * perPage + 1 : 0}–${Math.min(page * perPage, data?.meta.total ?? 0)} de ${data?.meta.total ?? 0} registros`}
          </span>
          <div>
            <button
              className={styles.secondary}
              onClick={() => setPage(page - 1)}
              disabled={loading || !data || page <= 1}
            >
              Anterior
            </button>
            <span>
              {page} / {Math.max(1, data?.meta.lastPage ?? 1)}
            </span>
            <button
              className={styles.secondary}
              onClick={() => setPage(page + 1)}
              disabled={
                loading || !data || page >= (data?.meta.lastPage ?? 1)
              }
            >
              Siguiente
            </button>
          </div>
        </div>
      </section>
      {resource === "users" && (
        <p className={styles.footnote}>
          <Icon name="shield" size={14} />
          Las cuentas se vinculan a sus perfiles desde Empresas, Clientes o
          Conductores.
        </p>
      )}
      {form && (
        <ResourceForm
          resource={resource}
          record={form.record}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            setNotice({ message: "Información guardada correctamente." });
            refreshSilently();
          }}
        />
      )}
      {detail && (
        <AdminModal
          title={`Detalle de ${config.singular}`}
          onClose={() => setDetail(null)}
        >
          <div className={styles.modalBody}>
            {textAt(detail, "photoUrl") && (
              <Image
                className={styles.detailPhoto}
                src={textAt(detail, "photoUrl")}
                alt={`Fotografía de ${textAt(detail, config.name)}`}
                width={100}
                height={100}
                unoptimized
              />
            )}
            <dl className={styles.details}>
              {[
                ...config.columns,
                ...config.fields
                  .filter(
                    (f) =>
                      !["password", "photo"].includes(f.name) &&
                      !config.columns.some((c) => c.key === f.name),
                  )
                  .map((f) => ({ key: f.name, label: f.label })),
              ].map((column) => (
                <div key={column.key}>
                  <dt>{column.label}</dt>
                  <dd>{displayValue(detail, column.key)}</dd>
                </div>
              ))}
            </dl>
            <div className={styles.modalActions}>
              <button
                className={styles.secondary}
                onClick={() => setDetail(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </AdminModal>
      )}
      {removing && (
        <AdminModal
          title={`Eliminar ${config.singular}`}
          onClose={() => setRemoving(null)}
          busy={deleteBusy}
        >
          <div className={styles.modalBody}>
            <p>
              ¿Quieres eliminar{" "}
              <strong>
                {textAt(removing, config.name) ||
                  `el registro #${textAt(removing, config.id)}`}
              </strong>
              ?
            </p>
            <p className={styles.formIntro}>
              Dejará de aparecer en los listados activos. Esta acción no elimina
              su cuenta de acceso.
            </p>
            {deleteError && (
              <p className={styles.error} role="alert">
                {deleteError}
              </p>
            )}
            <div className={styles.modalActions}>
              <button
                className={styles.secondary}
                disabled={deleteBusy}
                onClick={() => setRemoving(null)}
              >
                Cancelar
              </button>
              <button
                className={styles.danger}
                disabled={deleteBusy}
                onClick={remove}
              >
                {deleteBusy ? "Eliminando…" : "Confirmar eliminación"}
              </button>
            </div>
          </div>
        </AdminModal>
      )}
    </div>
  );
}

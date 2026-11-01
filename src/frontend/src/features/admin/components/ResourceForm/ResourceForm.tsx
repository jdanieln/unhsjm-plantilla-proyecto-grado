"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Select } from "@/components/ui/Select/Select";
import { PhotoUpload } from "@/components/ui/PhotoUpload/PhotoUpload";
import { modules, labels } from "../../config/modules";
import { adminRequest, allRows, saveResource } from "../../services/adminApi";
import {
  textAt,
  type Row,
  type AdminResource,
  type Option,
} from "../../types/admin";
import { AdminModal } from "../AdminModal/AdminModal";
import styles from "../../styles/Admin.module.css";

export function ResourceForm({
  resource,
  record,
  onClose,
  onSaved,
}: {
  resource: AdminResource;
  record?: Row;
  onClose: () => void;
  onSaved: () => void;
}) {
  const config = modules[resource];
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      config.fields.map((field) => [
        field.name,
        record ? textAt(record, field.name) : field.options?.[0]?.value || "",
      ]),
    ),
  );
  const [choices, setChoices] = useState<Record<string, Option[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function loadOptions() {
      setLoading(true);
      setLoadError("");
      try {
        const sources = [
          ...new Set(
            config.fields.flatMap((f) => (f.source ? [f.source] : [])),
          ),
        ];
        const entries = await Promise.all(
          sources.map(async (source): Promise<[string, Option[]]> => {
            const signal = controller.signal;
            if (source === "roles") {
              const roles = await adminRequest<Row[]>("/roles", { signal });
              return [
                source,
                roles
                  .filter((role) => Object.hasOwn(labels, textAt(role, "name")))
                  .map((role) => ({
                    value: textAt(role, "id"),
                    label: labels[textAt(role, "name")],
                  })),
              ];
            }
            if (source === "accounts") {
              const endpoint =
                resource === "companies"
                  ? "unassigned-company"
                  : resource === "clients"
                    ? "unassigned-client"
                    : "unassigned-driver-accounts";
              const rows = await adminRequest<Row[]>(`/users/${endpoint}`, {
                signal,
              });
              const options = rows.map((row) => ({
                value: textAt(row, "idUser"),
                label: `${textAt(row, "name")} · ${textAt(row, "email")}`,
              }));
              const current = record && textAt(record, "userId");
              if (current && !options.some((o) => o.value === current))
                options.unshift({
                  value: current,
                  label: record
                    ? textAt(record, "user.name") || `Cuenta actual #${current}`
                    : "",
                });
              return [source, options];
            }
            const rows = await allRows(source, signal);
            return [
              source,
              rows.map((row) => ({
                value: textAt(row, modules[source].id),
                label:
                  textAt(row, modules[source].name) ||
                  `Conductor · ${textAt(row, "license")}`,
                companyId: Number(row.idCompany),
              })),
            ];
          }),
        );
        if (!controller.signal.aborted) setChoices(Object.fromEntries(entries));
      } catch (cause) {
        if (!controller.signal.aborted)
          setLoadError(
            cause instanceof Error
              ? cause.message
              : "No se pudieron cargar las opciones.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadOptions();
    return () => controller.abort();
  }, [config, resource, record, attempt]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || loading || loadError) return;
    setBusy(true);
    setError("");
    try {
      const payload = new FormData();
      for (const field of config.fields) {
        if (field.type === "file") continue;
        const value =
          field.type === "password"
            ? values[field.name]
            : values[field.name]?.trim();
        if (field.required && !value)
          throw new Error(`Completa el campo ${field.label.toLowerCase()}.`);
        if (value) payload.set(field.name, value);
      }
      if (photo) payload.set("photo", photo);
      await saveResource(
        resource,
        payload,
        record ? textAt(record, config.id) : undefined,
      );
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminModal
      title={`${record ? "Editar" : "Crear"} ${config.singular}`}
      onClose={onClose}
      busy={busy}
    >
      <form
        onSubmit={submit}
        className={styles.modalBody}
        aria-busy={busy || loading}
      >
        <p className={styles.formIntro}>
          {resource === "users"
            ? "Elige el rol de la cuenta. Después podrás vincularla a su empresa, cliente o conductor."
            : "Completa la información. Los cambios se guardarán en la plataforma."}
        </p>
        {loading && <p role="status">Cargando opciones…</p>}
        {loadError && (
          <div className={styles.error} role="alert">
            {loadError}
            <button
              type="button"
              className={styles.textButton}
              onClick={() => setAttempt(attempt + 1)}
            >
              Reintentar
            </button>
          </div>
        )}
        <div className={styles.formGrid}>
          {config.fields.map((field) => {
            let options =
              field.options ||
              (field.source ? choices[field.source] || [] : []);
            if (field.source === "drivers")
              options = options.filter(
                (o) => o.companyId === Number(values.idCompany),
              );
            // Conserva estados históricos, sin sustituirlos silenciosamente al editar.
            if (
              field.options &&
              values[field.name] &&
              !options.some((o) => o.value === values[field.name])
            )
              options = [
                {
                  value: values[field.name],
                  label: labels[values[field.name]] || values[field.name],
                },
                ...options,
              ];
            return (
              <div
                className={`${styles.field} ${field.type === "file" ? styles.fullWidth : ""}`}
                key={field.name}
              >
                {field.type !== "file" && <label htmlFor={`admin-field-${field.name}`}>
                  {field.label}
                  {field.required && (
                    <span className={styles.required}> *</span>
                  )}
                </label>}
                {field.type === "select" ? (
                  <Select
                    id={`admin-field-${field.name}`}
                    label={field.label}
                    name={field.name}
                    value={values[field.name]}
                    required={field.required}
                    disabled={busy || loading || Boolean(loadError)}
                    onChange={(value) =>
                      setValues({
                        ...values,
                        [field.name]: value,
                      })
                    }
                    options={[
                      {
                        value: "",
                        label: field.required ? "Seleccionar…" : "Sin asignar",
                        disabled: Boolean(
                          record &&
                          field.source === "accounts" &&
                          textAt(record, "userId"),
                        ),
                      },
                      ...options,
                    ]}
                  />
                ) : field.type === "file" ? (
                  <PhotoUpload
                    label="Fotografía"
                    value={photo}
                    onChange={(file) => { setPhoto(file); setError(""); }}
                    existingUrl={record ? textAt(record, "photoUrl") : null}
                    disabled={busy}
                  />
                ) : (
                  <input
                    id={`admin-field-${field.name}`}
                    name={field.name}
                    type={field.type || "text"}
                    value={values[field.name]}
                    onChange={(event) =>
                      setValues({ ...values, [field.name]: event.target.value })
                    }
                    required={field.required}
                    minLength={field.minLength}
                    maxLength={field.maxLength}
                    autoComplete={
                      field.type === "password" ? "new-password" : "off"
                    }
                    disabled={busy}
                  />
                )}
                {field.source === "accounts" &&
                  !loading &&
                  !loadError &&
                  options.length === 0 && (
                    <small>
                      Crea primero una cuenta del rol correspondiente en
                      Usuarios, o guarda el perfil sin vincular.
                    </small>
                  )}
                {field.source === "drivers" &&
                  !loading &&
                  options.length === 0 && (
                    <small>
                      No hay conductores libres en esta empresa. Revisa su
                      vinculación en Conductores.
                    </small>
                  )}
              </div>
            );
          })}
        </div>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div className={styles.modalActions}>
          <button
            type="button"
            className={styles.secondary}
            disabled={busy}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className={styles.primary}
            disabled={busy || loading || Boolean(loadError)}
            type="submit"
          >
            {busy
              ? "Guardando…"
              : record
                ? "Guardar cambios"
                : `Crear ${config.singular}`}
          </button>
        </div>
      </form>
    </AdminModal>
  );
}

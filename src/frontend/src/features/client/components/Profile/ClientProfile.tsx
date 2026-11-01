"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ProfileLayout, ProfileReadOnly } from "@/components/ui/ProfileLayout/ProfileLayout";
import { Select } from "@/components/ui/Select/Select";
import { PhotoUpload } from "@/components/ui/PhotoUpload/PhotoUpload";
import { TimedNotice } from "@/components/ui/TimedNotice/TimedNotice";
import { useClientSession } from "../ClientShell/ClientShell";
import { DataState, PageHeader, workspaceStyles as ui } from "@/components/ui/Workspace/Workspace";
import { getProfile, saveProfile } from "../../services/clientApi";
import type { ClientProfile as ClientProfileData } from "../../types/client";

export function ClientProfile() {
  const { user, refresh } = useClientSession();
  const [profile, setProfile] = useState<ClientProfileData | null>(null);
  const [loading, setLoading] = useState(Boolean(user.idClient));
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const [typeClient, setTypeClient] = useState<"legal" | "natural">("natural");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!user.idClient) return;
    const controller = new AbortController();
    getProfile(user.idClient, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      setProfile(result);
      setTypeClient(result.typeClient);
      setLoading(false);
      setError("");
    }).catch((cause) => {
      if (controller.signal.aborted) return;
      setError(cause instanceof Error ? cause.message : "No pudimos cargar tu perfil.");
      setLoading(false);
    });
    return () => controller.abort();
  }, [user.idClient, version]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (file && file.size > 2 * 1024 * 1024) { setError("La fotografía debe pesar 2 MB o menos."); return; }
    const fields = new FormData(event.currentTarget);
    const payload = new FormData();
    payload.set("userId", String(user.idUser));
    payload.set("companyName", String(fields.get("companyName") || "").trim());
    payload.set("ruc", String(fields.get("ruc") || "").trim());
    payload.set("address", String(fields.get("address") || "").trim());
    payload.set("typeClient", typeClient);
    if (file) payload.set("photo", file);
    setBusy(true); setError(""); setNotice("");
    try {
      const saved = await saveProfile(user.idClient, payload);
      setProfile(saved);
      setFile(null);
      await refresh();
      setNotice("Tu perfil se guardó correctamente.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar tu perfil."); }
    finally { setBusy(false); }
  }

  return <>
    <PageHeader eyebrow="TU INFORMACIÓN EN ORDEN" title="Mi perfil" description="Mantén al día los datos con los que solicitas tus envíos." />
    {notice && <TimedNotice message={notice} onDismiss={() => setNotice("")} />}
    {loading ? <div className={ui.card}><DataState loading empty="" /></div> : error && user.idClient && !profile ? <div className={ui.card}><DataState error={error} empty="" onRetry={() => { setLoading(true); setVersion((value) => value + 1); }} /></div> :
      <ProfileLayout name={profile?.companyName || user.name} email={user.email} photoUrl={profile?.photoUrl}
        role={profile?.typeClient === "legal" ? "Persona jurídica" : profile?.typeClient === "natural" ? "Persona natural" : "Nuevo perfil"}
        prompt={!user.idClient ? "Completa tu perfil para comenzar a crear pedidos." : undefined}
        heading="Datos del cliente" description="Esta información identifica tus solicitudes de transporte.">
          <form key={profile?.idClient ?? "new"} className={ui.form} onSubmit={(event) => void save(event)}>
            <div className={ui.formGrid}><label className={ui.field}>Nombre o razón social<input name="companyName" defaultValue={profile?.companyName || user.name} maxLength={255} required /></label><label className={ui.field}>Tipo de persona<Select label="Tipo de persona" value={typeClient} options={[{value:"natural",label:"Persona natural"},{value:"legal",label:"Persona jurídica"}]} onChange={(value) => setTypeClient(value as "legal" | "natural")} /></label></div>
            <div className={ui.formGrid}><label className={ui.field}>Identificación o RUC<input name="ruc" defaultValue={profile?.ruc || ""} maxLength={20} required /></label><div className={ui.field}><PhotoUpload value={file} onChange={setFile} existingUrl={profile?.photoUrl} disabled={busy} /></div></div>
            <label className={ui.field}>Dirección<input name="address" defaultValue={profile?.address || ""} required /></label>
            <ProfileReadOnly items={[{label:"Correo de acceso",value:user.email},{label:"Nombre de la cuenta",value:user.name}]} />
            {error && <p className={ui.error} role="alert">{error}</p>}
            <div className={ui.actions}><button className={ui.primary} disabled={busy}>{busy ? "Guardando…" : profile ? "Guardar cambios" : "Crear mi perfil"}</button></div>
          </form>
      </ProfileLayout>}
  </>;
}

"use client";
import { useState, type FormEvent } from "react";
import { useOperationalSession } from "@/components/ui/OperationalShell/OperationalShell";
import { PhotoUpload } from "@/components/ui/PhotoUpload/PhotoUpload";
import { ProfileLayout, ProfileReadOnly } from "@/components/ui/ProfileLayout/ProfileLayout";
import { Select } from "@/components/ui/Select/Select";
import { TimedNotice } from "@/components/ui/TimedNotice/TimedNotice";
import { DataState, PageHeader, workspaceStyles as w } from "@/components/ui/Workspace/Workspace";
import { useResource } from "../hooks/useResource";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { api, driverLabels, type CompanyProfile, type Driver } from "../services/operationsApi";

export function Profile() {
  const { user, refresh } = useOperationalSession();
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(false);
  const company = user.role === "company";
  const id = company ? user.idCompany : user.idDriver;
  const path = company ? "/companies" : "/drivers";
  const resource = useResource<CompanyProfile & Driver>(id ? path + "/" + id : null);
  useAutoRefresh(resource.reload, Boolean(id) && !editing);
  return <>
    <PageHeader eyebrow="TU IDENTIDAD EN TRAVELDLS" title={company ? "Perfil de empresa" : "Mi perfil"} description="Mantén tus datos y tu fotografía actualizados." />
    {notice && <TimedNotice message={notice} onDismiss={() => setNotice("")} />}
    {resource.error && resource.data && <p className={w.error} role="status">No se pudo actualizar el perfil. Se muestran los últimos datos disponibles.</p>}
    {resource.loading || (resource.error && !resource.data) ? <DataState loading={resource.loading} error={resource.error} empty="" onRetry={resource.reload} /> :
      <ProfileForm key={`${id}:${resource.data?.photoUrl || ""}:${resource.data?.status || ""}`} data={resource.data} company={company} accountName={user.name} email={user.email} onEditing={() => setEditing(true)} save={async (form) => {
        if (!id) form.set("userId", String(user.idUser));
        await api(id ? path + "/" + id : path, id ? "PUT" : "POST", form);
        setNotice("Perfil actualizado.");
        await refresh(); setEditing(false); resource.reload();
      }} />}
  </>;
}
function ProfileForm({ data, company, accountName, email, save, onEditing }: { data: (CompanyProfile & Driver) | null; company: boolean; accountName: string; email: string; save: (form: FormData) => Promise<void>; onEditing: () => void }) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [status, setStatus] = useState(data?.status || "offline");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    if (photo) form.set("photo", photo);
    if (!company) form.set("status", status);
    try { await save(form); setPhoto(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar."); }
    finally { setBusy(false); }
  }
  return <ProfileLayout name={company ? data?.businessName || accountName : accountName} email={email} photoUrl={data?.photoUrl}
    role={company ? "Empresa de transporte" : "Conductor"} heading={company ? "Datos de la empresa" : "Datos del conductor"}
    description={company ? "Esta información identifica a tu empresa ante los clientes." : "Mantén al día los datos de tu cuenta y disponibilidad."}>
    <form className={w.form} onSubmit={submit} onChange={onEditing}>
      <PhotoUpload value={photo} onChange={file => {setPhoto(file);onEditing();}} existingUrl={data?.photoUrl} disabled={busy} />
      <div className={w.formGrid}>{company ? <>
        <label className={w.field}>Nombre de la empresa<input name="businessName" defaultValue={data?.businessName} required maxLength={255} /></label>
        <label className={w.field}>RUC<input name="ruc" defaultValue={data?.ruc} required maxLength={20} /></label>
      </> : <>
        <label className={w.field}>Licencia<input name="license" defaultValue={data?.license} required minLength={5} /></label>
        <label className={w.field}>Documento / pasaporte<input name="passport" defaultValue={data?.passport} required minLength={5} /></label>
      </>}</div>
      {!company && <Select label="Disponibilidad" value={status} onChange={value => {setStatus(value);onEditing();}} options={Object.entries(driverLabels).filter(([key]) => key !== "ontrip" || status === "ontrip").map(([value,label]) => ({value,label}))} />}
      <ProfileReadOnly items={[{label:"Correo de acceso",value:email},{label:"Nombre de la cuenta",value:accountName}]} />
      {error && <p className={w.error} role="alert">{error}</p>}
      <div className={w.actions}><button className={w.primary} disabled={busy}>{busy ? "Guardando…" : "Guardar cambios"}</button></div>
    </form>
  </ProfileLayout>;
}

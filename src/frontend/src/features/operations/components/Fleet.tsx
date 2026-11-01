"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useOperationalSession } from "@/components/ui/OperationalShell/OperationalShell";
import { ResourceTable } from "@/components/ui/ResourceTable/ResourceTable";
import { ActionButton, Modal, PageHeader, StatusBadge, workspaceStyles as w } from "@/components/ui/Workspace/Workspace";
import { PhotoUpload } from "@/components/ui/PhotoUpload/PhotoUpload";
import { Select } from "@/components/ui/Select/Select";
import { TimedNotice } from "@/components/ui/TimedNotice/TimedNotice";
import type { Page } from "@/features/client/types/client";
import { useResource } from "../hooks/useResource";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { api, allPages, driverLabels, truckLabels, type Driver, type Truck } from "../services/operationsApi";
import s from "./Operations.module.css";

export function Fleet({kind}:{kind:"drivers"|"trucks"}) {
  const {user}=useOperationalSession();
  const [page,setPage]=useState(1),[size,setSize]=useState(10),[search,setSearch]=useState(""),[query,setQuery]=useState("");
  const [editor,setEditor]=useState<Driver|Truck|"new"|null>(null),[removing,setRemoving]=useState<Driver|Truck|null>(null),[account,setAccount]=useState<Driver|null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState(""),[danger,setDanger]=useState(false);
  const isDriver=kind==="drivers";
  const resource=useResource<Page<Driver & Truck>>(`/${kind}?idCompany=${user.idCompany}&page=${page}&perPage=${size}&search=${encodeURIComponent(query)}`);
  useAutoRefresh(resource.reload, Boolean(user.idCompany) && !editor && !removing && !account);
  const id=(row:Driver|Truck)=>"idTruck" in row?row.idTruck:row.idDriver;
  function saved(message:string,red=false){setEditor(null);setRemoving(null);setAccount(null);setNotice(message);setDanger(red);setPage(1);resource.reload();}
  async function remove(){
    if(!removing)return;setBusy(true);setError("");
    try{await api("/"+kind+"/"+id(removing),"DELETE");saved(isDriver?"Conductor eliminado.":"Camión eliminado.",true);}
    catch(cause){setError(cause instanceof Error?cause.message:"No se pudo eliminar.");}finally{setBusy(false);}
  }
  return <>
    <PageHeader eyebrow="LOS RECURSOS DE TU EMPRESA" title={isDriver?"Conductores":"Camiones"}
      description={isDriver?"Organiza tu equipo y administra sus accesos a TravelDLS.":"Administra tus vehículos, sus categorías y sus conductores."}
      action={<ActionButton icon="plus" variant="primary" onClick={()=>setEditor("new")}>{isDriver?"Agregar conductor":"Agregar camión"}</ActionButton>} />
    {notice && <TimedNotice message={notice} tone={danger?"danger":"success"} onDismiss={()=>setNotice("")} />}
    {resource.error && resource.data && <p className={w.error} role="status">No se pudo actualizar el listado. Se muestran los últimos datos disponibles.</p>}
    <form className={s.toolbar} onSubmit={e=>{e.preventDefault();setQuery(search);setPage(1);}}>
      <label className={w.field}>Buscar<input value={search} onChange={e=>setSearch(e.target.value)} placeholder={isDriver?"Nombre o licencia":"Placa o chasis"} /></label>
      <button className={w.secondary}>Buscar</button><ActionButton icon="refresh" onClick={resource.reload}>Actualizar</ActionButton>
    </form>
    <ResourceTable rows={resource.data?.data || []} rowKey={id} loading={resource.loading} error={resource.data ? "" : resource.error} onRetry={resource.reload} page={page} perPage={size} total={resource.data?.meta.total || 0}
      onPage={setPage} onPerPage={v=>{setSize(v);setPage(1);}} columns={[
        {label:isDriver?"Conductor":"Placa",render:row=><strong>{isDriver?(row.user?.name || "Sin cuenta · "+row.license):row.plate}</strong>},
        {label:isDriver?"Licencia":"Categoría",render:row=>isDriver?row.license:row.category?.nameCategory || "—"},
        {label:isDriver?"Documento":"Conductor",render:row=>isDriver?row.passport:row.driver?.user?.name || row.driver?.license || "—"},
        {label:"Estado",render:row=><div className={s.fleetStatus}><StatusBadge status={row.status} label={(isDriver?driverLabels:truckLabels)[row.status]} />{!isDriver && row.maintenanceReason && <span title={row.maintenanceReason}>{row.maintenanceReason}</span>}</div>},
        {label:"Acciones",render:row=><div className={w.rowActions}><ActionButton icon="edit" onClick={()=>setEditor(row)}>Editar</ActionButton>
          {isDriver && !row.user && <ActionButton icon="user" onClick={()=>setAccount(row)}>Crear acceso</ActionButton>}
          <ActionButton icon="trash" variant="danger" onClick={()=>{setError("");setRemoving(row);}}>Eliminar</ActionButton></div>}
      ]} />
    {editor && <FleetForm kind={kind} data={editor==="new"?null:editor} idCompany={user.idCompany!} onClose={()=>setEditor(null)} onSaved={()=>saved("Datos guardados correctamente.")} />}
    {account && <AccountForm driver={account} onClose={()=>setAccount(null)} onSaved={()=>saved("Acceso de conductor creado y vinculado.")} />}
    {removing && <Modal title={isDriver?"Eliminar conductor":"Eliminar camión"} onClose={()=>setRemoving(null)} busy={busy}>
      <p>¿Deseas eliminar este registro de tu empresa?</p>{error && <p className={w.error} role="alert">{error}</p>}
      <div className={w.actions}><ActionButton disabled={busy} onClick={()=>setRemoving(null)}>Volver</ActionButton><ActionButton variant="danger" disabled={busy} onClick={remove}>{busy?"Eliminando…":"Eliminar"}</ActionButton></div>
    </Modal>}
  </>;
}

function FleetForm({kind,data,idCompany,onClose,onSaved}:{kind:"drivers"|"trucks";data:Driver|Truck|null;idCompany:number;onClose:()=>void;onSaved:()=>void}) {
  const isDriver=kind==="drivers", truck=data as Truck|null, driver=data as Driver|null;
  const [photo,setPhoto]=useState<File|null>(null),[status,setStatus]=useState(data?.status || (isDriver?"offline":"active"));
  const [maintenanceReason,setMaintenanceReason]=useState(truck?.maintenanceReason || "");
  const [driverId,setDriverId]=useState(truck?.idDriver?String(truck.idDriver):""),[category,setCategory]=useState(truck?.idCategory?String(truck.idCategory):"");
  const [drivers,setDrivers]=useState<Driver[]>([]),[categories,setCategories]=useState<{idCategory:number;nameCategory:string}[]>([]);
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[ready,setReady]=useState(isDriver);
  useEffect(()=>{
    if(isDriver)return;
    const abort=new AbortController();
    Promise.all([allPages<Driver>("/drivers?idCompany="+idCompany,abort.signal),allPages<{idCategory:number;nameCategory:string}>("/categories",abort.signal)])
      .then(([people,types])=>{setDrivers(people);setCategories(types);setReady(true);})
      .catch(cause=>{if(!abort.signal.aborted)setError(cause.message);});
    return ()=>abort.abort();
  },[idCompany,isDriver]);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setError("");
    const form=new FormData(event.currentTarget);form.set("idCompany",String(idCompany));form.set("status",status);
    const id=data?(isDriver?(data as Driver).idDriver:(data as Truck).idTruck):null;
    if(isDriver && photo)form.set("photo",photo);
    if(!isDriver){form.set("idDriver",driverId);form.set("idCategory",category);if(status==="mantenimiento")form.set("maintenanceReason",maintenanceReason.trim());}
    try{await api("/"+kind+(id?"/"+id:""),id?"PUT":"POST",form);onSaved();}
    catch(cause){setError(cause instanceof Error?cause.message:"No se pudo guardar.");}finally{setBusy(false);}
  }
  return <Modal title={(data?"Editar ":"Agregar ")+(isDriver?"conductor":"camión")} onClose={onClose} busy={busy}>
    <form className={w.form} onSubmit={submit}>
      {isDriver && <PhotoUpload value={photo} onChange={setPhoto} existingUrl={driver?.photoUrl} disabled={busy} />}
      <div className={w.formGrid}>{isDriver?<>
        <label className={w.field}>Licencia<input name="license" required minLength={5} defaultValue={driver?.license} /></label>
        <label className={w.field}>Documento / pasaporte<input name="passport" required minLength={5} defaultValue={driver?.passport} /></label>
      </>:<>
        <label className={w.field}>Placa<input name="plate" required minLength={3} maxLength={50} defaultValue={truck?.plate} /></label>
        <label className={w.field}>Chasis<input name="chassis" required minLength={5} maxLength={100} defaultValue={truck?.chassis} /></label>
      </>}</div>
      {!isDriver && <>
        <Select label="Conductor" value={driverId} onChange={setDriverId} options={drivers.map(d=>({value:String(d.idDriver),label:d.user?.name || d.license}))} />
        <Select label="Tipo de camión" value={category} onChange={setCategory} options={categories.map(c=>({value:String(c.idCategory),label:c.nameCategory}))} />
      </>}
      <Select label="Estado" value={status} onChange={setStatus} options={Object.entries(isDriver?driverLabels:{active:"Activo",mantenimiento:"Mantenimiento",inactive:"Inactivo"}).map(([value,label])=>({value,label}))} />
      {!isDriver && status==="mantenimiento" && <label className={w.field}>Motivo del mantenimiento
        <textarea value={maintenanceReason} onChange={event=>setMaintenanceReason(event.target.value)} minLength={10} maxLength={500} required placeholder="Describe qué necesita revisión…" />
        <small>Mínimo 10 caracteres · {maintenanceReason.trim().length}/500</small>
      </label>}
      {isDriver && !data && <p className={s.intro}>Después de guardar puedes crear su acceso con nombre, correo y contraseña desde el listado.</p>}
      {error && <p className={w.error} role="alert">{error}</p>}
      <div className={w.actions}><ActionButton disabled={busy} onClick={onClose}>Cancelar</ActionButton><button className={w.primary} disabled={busy || !ready || (!isDriver && (!driverId || !category || (status==="mantenimiento" && maintenanceReason.trim().length<10)))}>{busy?"Guardando…":"Guardar"}</button></div>
    </form>
  </Modal>;
}
function AccountForm({driver,onClose,onSaved}:{driver:Driver;onClose:()=>void;onSaved:()=>void}) {
  const [createdId,setCreatedId]=useState<number|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setError("");
    const form=new FormData(event.currentTarget);
    try{
      let userId=createdId;
      if(!userId){const result=await api<{user:{idUser:number}}>("/auth/register-driver","POST",Object.fromEntries(form));userId=result.user.idUser;setCreatedId(userId);}
      await api("/drivers/"+driver.idDriver,"PUT",{userId});onSaved();
    }catch(cause){setError(cause instanceof Error?cause.message:"No se pudo crear el acceso.");}finally{setBusy(false);}
  }
  return <Modal title="Crear acceso de conductor" onClose={onClose} busy={busy}><form className={w.form} onSubmit={submit}>
    <p className={s.intro}>Vincula una cuenta a la licencia {driver.license}.</p>
    <label className={w.field}>Nombre<input name="name" required minLength={3} disabled={!!createdId} autoComplete="off" /></label>
    <label className={w.field}>Correo<input type="email" name="email" required disabled={!!createdId} autoComplete="off" /></label>
    <label className={w.field}>Contraseña inicial<input type="password" name="password" required minLength={8} disabled={!!createdId} autoComplete="new-password" /></label>
    {createdId && <p role="status">La cuenta #{createdId} ya está creada. Reintenta para vincularla al conductor.</p>}
    {error && <p className={w.error} role="alert">{error}</p>}
    <div className={w.actions}><ActionButton disabled={busy} onClick={onClose}>Cerrar</ActionButton><button className={w.primary} disabled={busy}>{busy?"Guardando…":createdId?"Vincular cuenta":"Crear acceso"}</button></div>
  </form></Modal>;
}

"use client";
import { DeliveryPanel } from "@/features/deliveries/DeliveryPanel";
import { useCallback, useEffect, useState } from "react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { useOperationalSession } from "@/components/ui/OperationalShell/OperationalShell";
import { ResourceTable } from "@/components/ui/ResourceTable/ResourceTable";
import { Select } from "@/components/ui/Select/Select";
import { DetailCard } from "@/components/ui/DetailCard/DetailCard";
import { TimedNotice } from "@/components/ui/TimedNotice/TimedNotice";
import { DriverTripMap } from "./DriverTripMap";
import { ActionButton, DataState, Modal, PageHeader, StatusBadge, workspaceStyles as w } from "@/components/ui/Workspace/Workspace";
import { orderStatusLabels, formatDate, formatMoney, formatWeight } from "@/features/client/types/client";
import { api, allPages, OperationsError, type Driver, type OperationalOrder, type Truck } from "../services/operationsApi";
import s from "./Operations.module.css";

export function Orders() {
  const { user } = useOperationalSession();
  const company = user.role === "company";
  const [orders,setOrders]=useState<OperationalOrder[]>([]), [loading,setLoading]=useState(true), [error,setError]=useState("");
  const [page,setPage]=useState(1), [size,setSize]=useState(10), [status,setStatus]=useState(""), [version,setVersion]=useState(0);
  const [selected,setSelected]=useState<OperationalOrder | null>(null);
  const [mapOrder,setMapOrder]=useState<OperationalOrder | null>(null);
  const [notice,setNotice]=useState(""), [tone,setTone]=useState<"success" | "danger">("success");
  const refreshSilently = useCallback(() => setVersion(value => value + 1), []);
  useAutoRefresh(refreshSilently, Boolean(company ? user.idCompany : user.idDriver));
  useEffect(()=>{
    const abort = new AbortController();
    allPages<OperationalOrder>(`/orders?${company ? "idCompany" : "idDriver"}=${company ? user.idCompany : user.idDriver}`,abort.signal)
      .then(rows=>{if(!abort.signal.aborted){setOrders(rows);setSelected(current=>current?rows.find(row=>row.idOrder===current.idOrder)||current:null);setMapOrder(current=>current?rows.find(row=>row.idOrder===current.idOrder)||current:null);setError("");}}).catch(cause=>{if(!abort.signal.aborted)setError(cause.message);})
      .finally(()=>{if(!abort.signal.aborted)setLoading(false);});
    return ()=>abort.abort();
  },[company,user.idCompany,user.idDriver,version]);
  const filtered=orders.filter(order=>!status || order.status===status);
  const reload=()=>{setLoading(true);setError("");setVersion(v=>v+1);};
  return <>
    <PageHeader eyebrow={company ? "COORDINA CADA ENVÍO" : "TU PRÓXIMO DESTINO"} title={company ? "Pedidos" : "Mis viajes"}
      description={company ? "Revisa las cargas, prepara cotizaciones y asigna tu equipo." : "Consulta tus cargas asignadas y actualiza el avance de tus entregas."}
      action={<ActionButton icon="refresh" onClick={reload}>Actualizar</ActionButton>} />
    {notice && <TimedNotice message={notice} tone={tone} onDismiss={()=>setNotice("")} />}
    {error && orders.length > 0 && !loading && <p className={w.error} role="status">No se pudieron actualizar los pedidos. Se muestran los últimos datos disponibles.</p>}
    <div className={s.toolbar}><Select label="Estado del pedido" value={status} onChange={v=>{setStatus(v);setPage(1);}} options={[{value:"",label:"Todos"},...Object.entries(orderStatusLabels).map(([value,label])=>({value,label}))]} /></div>
    <ResourceTable rows={filtered.slice((page-1)*size,page*size)} rowKey={o=>o.idOrder} loading={loading} error={orders.length ? "" : error} onRetry={reload}
      page={page} perPage={size} total={filtered.length} onPage={setPage} onPerPage={v=>{setSize(v);setPage(1);}}
      columns={[{label:"Pedido",render:o=><strong>#{o.idOrder}</strong>},{label:"Cliente",render:o=>o.client?.companyName || o.client?.user?.name || "—"},
        {label:"Estado",render:o=><StatusBadge status={o.status} label={orderStatusLabels[o.status]} />},{label:"Cargas",render:o=>o.details?.length || 0},
        {label:"Fecha",render:o=>formatDate(o.createdAt)},{label:"Acción",render:o=><ActionButton icon="eye" onClick={()=>setSelected(o)}>Ver detalles</ActionButton>}]} />
    {selected && <OrderDialog order={selected} company={company} idCompany={user.idCompany} idDriver={user.idDriver}
      hasActiveTrip={orders.some(o=>o.details?.some(d=>d.deliveryStatus==="in_transit"))} onClose={()=>setSelected(null)}
      onOpenMap={()=>{setMapOrder(selected);setSelected(null);}}
      onTripStarted={()=>setMapOrder({...selected,status:"en_transito"})}
      onSaved={(message,danger)=>{setSelected(null);setPage(1);setNotice(message);setTone(danger?"danger":"success");reload();}} />}
    {!company && mapOrder && <DriverTripMap order={mapOrder} onClose={()=>setMapOrder(null)} />}
  </>;
}
function OrderDialog({order,company,idCompany,idDriver,hasActiveTrip,onClose,onSaved,onOpenMap,onTripStarted}:{
  order:OperationalOrder;company:boolean;idCompany:number|null;idDriver:number|null;hasActiveTrip:boolean;
  onClose:()=>void;onSaved:(message:string,danger?:boolean)=>void;onOpenMap:()=>void;onTripStarted:()=>void;
}) {
  const [drivers,setDrivers]=useState<Driver[]>([]), [driver,setDriver]=useState("");
  const [prices,setPrices]=useState<Record<number,string>>(() => Object.fromEntries((order.details || []).map(detail => [detail.idDetails, order.status === "denegado" && Number(detail.amount) > 0 ? String(detail.amount) : ""]))), [busy,setBusy]=useState(false), [error,setError]=useState(""), [ready,setReady]=useState(false);
  const [block,setBlock]=useState(""), [confirm,setConfirm]=useState<string | null>(null);
  useEffect(()=>{
    const abort=new AbortController();
    async function load() {
      if(company && ["aceptado","requiere_nueva_entrega"].includes(order.status) && order.payment?.status === "pagado") {
        setDrivers(await allPages<Driver>(`/drivers?idCompany=${idCompany}&availableForOrders=true`,abort.signal));
      } else if (!company) {
        const profile=await api<Driver>("/drivers/"+idDriver,"GET",undefined,abort.signal);
        let truck:Truck|null=null;
        try {truck=await api<Truck>("/driver/truck","GET",undefined,abort.signal);} catch(cause){if(!(cause instanceof OperationsError && cause.status===404))throw cause;}
        setBlock(hasActiveTrip ? "Ya tienes un viaje en curso." : profile.status!=="available" ? "Marca tu perfil como disponible antes de iniciar." : !truck ? "No tienes camión asignado." : !["active","activo"].includes(truck.status) ? "El camión no está activo." : "");
      }
    }
    load().then(()=>{if(!abort.signal.aborted)setReady(true);}).catch(cause=>{if(!abort.signal.aborted)setError(cause.message);});
    return ()=>abort.abort();
  },[company,idCompany,idDriver,hasActiveTrip,order.status,order.payment?.status]);
  async function execute(path:string,method:string,body:object,message:string,danger=false,afterSuccess?:()=>void) {
    if(busy)return;setBusy(true);setError("");
    try {await api(path,method,body);onSaved(message,danger);afterSuccess?.();}
    catch(cause){setError(cause instanceof Error?cause.message:"No se pudo guardar.");}
    finally{setBusy(false);}
  }
  const base="/orders/"+order.idOrder;
  const canQuote = company && ["pendiente", "denegado"].includes(order.status) && !!order.details?.length;
  const quotePrices = (order.details || []).map(detail => ({ idDetails: detail.idDetails, amount: Number(prices[detail.idDetails]) }));
  const quoteIsValid = quotePrices.length > 0 && quotePrices.every(price => Number.isFinite(price.amount) && price.amount > 0);
  const isPaid = order.payment?.status === "pagado";
  return <Modal title={`Pedido #${order.idOrder}`} eyebrow={company?"CENTRO DE OPERACIONES":"TU HOJA DE RUTA"} onClose={onClose} busy={busy}>
    <div className={s.stack}>
      <StatusBadge status={order.status} label={orderStatusLabels[order.status]} />
      {order.details?.map(detail=><DetailCard key={detail.idDetails} title={detail.cargoDescription} amount={formatMoney(Number(detail.amount))} facts={[
        {label:"Peso",value:formatWeight(detail.unitWeight)},{label:"Embalaje",value:detail.typePackaging},{label:"Entrega",value:detail.deliveryAddress,wide:true},
        {label:"Conductor",value:detail.driver?.user?.name || detail.driver?.name || "Sin asignar"}
      ]} />)}
      {!order.details?.length && <DataState empty="El pedido todavía no tiene cargas" />}
      {company && order.status === "esperando_aprobacion" && <p className={w.notice}>La cotización está pendiente de la respuesta del cliente. Podrás enviar otro precio si la rechaza.</p>}
      {company && order.status === "denegado" && <p className={w.error}>Cotización rechazada. Envía nuevos precios para todas las cargas o anula el pedido.</p>}
      {canQuote && <div className={s.quoteForm}>
        <h3>Cotización por carga</h3><p className={s.intro}>Indica un precio para cada carga. El cliente aprobará el total.</p>
        {(order.details || []).map((detail,index) => <label className={w.field} key={detail.idDetails}>{index + 1}. {detail.cargoDescription} (C$)<input type="number" min="0.01" step="0.01" required value={prices[detail.idDetails] || ""} onChange={e=>setPrices(current=>({...current,[detail.idDetails]:e.target.value}))} /></label>)}
        <strong>Total: {formatMoney(quoteIsValid ? quotePrices.reduce((sum, price) => sum + price.amount, 0) : 0)}</strong>
        <ActionButton variant="primary" disabled={busy || !quoteIsValid} onClick={()=>execute(base+"/assign-price","PATCH",{prices:quotePrices},"Cotización enviada al cliente.")}>{order.status === "denegado" ? "Enviar nueva cotización" : "Enviar cotización"}</ActionButton>
      </div>}
      {company && ["aceptado","requiere_nueva_entrega"].includes(order.status) && !isPaid && <p className={w.notice}>Este pedido aún no tiene un pago vigente. Se podrá asignar un conductor después del pago.</p>}
      {company && ["aceptado","requiere_nueva_entrega"].includes(order.status) && isPaid && !!order.details?.length && <>
        <Select label="Conductor para las cargas pendientes" value={driver} onChange={setDriver} options={drivers.map(d=>({value:String(d.idDriver),label:d.user?.name || d.license}))} />
        {ready && !drivers.length && <p className={s.intro}>No hay conductores disponibles con camión activo.</p>}
        <ActionButton disabled={busy || !driver || !ready} icon="user" onClick={()=>execute(base+"/assign-driver","PATCH",{idDriver:Number(driver)},"Conductor asignado.")}>Asignar conductor</ActionButton>
      </>}
      {!company && order.status==="aceptado" && <><p className={s.intro}>{block || "Cuando estés listo, inicia el viaje para actualizar el estado de la entrega."}</p>
        <ActionButton variant="primary" icon="truck" disabled={busy || !ready || !!block} disabledReason={block} onClick={()=>setConfirm("en_transito")}>Iniciar viaje</ActionButton></>}
      {!company && order.details?.some(d=>d.deliveryStatus==="in_transit") && <div className={w.rowActions}>
        <ActionButton disabled={busy} icon="route" onClick={onOpenMap}>Abrir mapa GPS</ActionButton>

      </div>}
      {company && ["pendiente","esperando_aprobacion","denegado","aceptado"].includes(order.status) && !isPaid && <ActionButton variant="danger" disabled={busy} onClick={()=>setConfirm("anulado")}>Anular pedido</ActionButton>}
      {confirm && <div className={w.card+" "+w.cardPad}><p>¿Confirmas {confirm==="en_transito"?"el inicio del viaje":confirm==="entregado"?"que la carga fue entregada":"la anulación del pedido"}?</p>
        <div className={w.rowActions}><ActionButton disabled={busy} onClick={()=>setConfirm(null)}>Volver</ActionButton><ActionButton disabled={busy} variant={confirm==="anulado"?"danger":"primary"} onClick={()=>execute(base,"PUT",{status:confirm},confirm==="anulado"?"Pedido anulado.":confirm==="entregado"?"Entrega registrada.":"Viaje iniciado.",confirm==="anulado",confirm==="en_transito"?onTripStarted:undefined)}>Confirmar</ActionButton></div>
      </div>}
      <DeliveryPanel orderId={order.idOrder} role={company?"company":"driver"} driverId={idDriver} onChanged={()=>onSaved("Estado de entrega actualizado.")} />
      {error && <p className={w.error} role="alert">{error}</p>}
      <div className={w.actions}><ActionButton disabled={busy} onClick={onClose}>Cerrar</ActionButton></div>
    </div>
  </Modal>;
}

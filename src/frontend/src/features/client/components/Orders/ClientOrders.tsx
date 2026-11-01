"use client";
import { DeliveryPanel } from "@/features/deliveries/DeliveryPanel";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon/Icon";
import { Select } from "@/components/ui/Select/Select";
import { DetailCard } from "@/components/ui/DetailCard/DetailCard";
import { TimedNotice } from "@/components/ui/TimedNotice/TimedNotice";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { CompanyChoiceCard } from "./CompanyChoiceCard";
import { PaymentCheckout, type PaymentSubmission } from "./PaymentCheckout";
import { ClientTripMap } from "./ClientTripMap";
import { useClientSession } from "../ClientShell/ClientShell";
import { ActionButton, DataState, Modal, PageHeader, Pagination, StatusBadge, workspaceStyles as ui } from "@/components/ui/Workspace/Workspace";
import {
  createDetail, createOrder, deleteDetail, getCompanies, getOrder,
  getOrders, respondPrice, simulatePayment, updateDetail,
} from "../../services/clientApi";
import {
  formatDate, formatMoney, formatWeight, matchesOrderFilter, orderStatusLabels, packagingTypes, parseWeight, weightUnits,
  type Company, type NewDetail, type Order, type OrderFilter,
} from "../../types/client";
import styles from "./ClientOrders.module.css";

const blankDetail = (): NewDetail => ({
  cargoDescription: "", unitWeight: "1", weightUnit: "kg",
  deliveryAddress: "", typePackaging: "caja",
});

const orderFilters: { value: OrderFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "pendiente", label: "Pendientes" },
  { value: "esperando_aprobacion", label: "Cotizados" },
  { value: "en_transito", label: "En tránsito" },
  { value: "entregado", label: "Finalizados" },
  { value: "cancelled", label: "Cancelados y rechazados" },
];

export function ClientOrders({ initialNew = false, initialOrderId }: { initialNew?: boolean; initialOrderId?: number }) {
  const { user } = useClientSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(Boolean(user.idClient));
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<{ message: string; tone?: "success" | "danger" } | null>(null);
  const [filter, setFilter] = useState<OrderFilter>("all");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyPage, setCompanyPage] = useState(1);
  const [companyLastPage, setCompanyLastPage] = useState(1);
  const [companySearch, setCompanySearch] = useState("");
  const [companyDraft, setCompanyDraft] = useState("");
  const [companyLoading, setCompanyLoading] = useState(initialNew && Boolean(user.idClient));
  const [companyVersion, setCompanyVersion] = useState(0);
  const [companyError, setCompanyError] = useState("");
  const [chooserOpen, setChooserOpen] = useState(initialNew && Boolean(user.idClient));
  const [company, setCompany] = useState<Company | null>(null);
  const [draft, setDraft] = useState<NewDetail>(blankDetail);
  const [cart, setCart] = useState<NewDetail[]>([]);
  const [pendingOrderId, setPendingOrderId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editDraft, setEditDraft] = useState<NewDetail>(blankDetail);
  const [addMode, setAddMode] = useState(false);
  const [recoveryDraft, setRecoveryDraft] = useState<NewDetail>(blankDetail);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

  const refreshSilently = useCallback(() => setVersion((value) => value + 1), []);
  useAutoRefresh(refreshSilently, Boolean(user.idClient));
  const refreshCompaniesSilently = useCallback(() => setCompanyVersion(value => value + 1), []);
  useAutoRefresh(refreshCompaniesSilently, chooserOpen && Boolean(user.idClient));

  useEffect(() => {
    if (!user.idClient) return;
    const idClient = user.idClient;
    const controller = new AbortController();
    async function load() {
      try {
        if (filter === "all") {
          const result = await getOrders(idClient, page, perPage, controller.signal);
          if (controller.signal.aborted) return;
          setOrders(result.data);
          setTotal(result.meta.total);
          setLastPage(Math.max(1, result.meta.lastPage));
        } else {
          const first = await getOrders(idClient, 1, 100, controller.signal);
          const all = [...first.data];
          for (let current = 2; current <= first.meta.lastPage; current++) {
            const next = await getOrders(idClient, current, 100, controller.signal);
            all.push(...next.data);
          }
          if (controller.signal.aborted) return;
          const filtered = all.filter((order) => matchesOrderFilter(order.status, filter));
          const filteredLastPage = Math.max(1, Math.ceil(filtered.length / perPage));
          if (page > filteredLastPage) { setPage(filteredLastPage); return; }
          setOrders(filtered.slice((page - 1) * perPage, page * perPage));
          setTotal(filtered.length);
          setLastPage(filteredLastPage);
        }
        setError("");
        setLoading(false);
      } catch (cause) {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : "No se pudieron cargar tus pedidos.");
        setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [user.idClient, page, perPage, filter, version]);

  useEffect(() => {
    if (!chooserOpen) return;
    const controller = new AbortController();
    getCompanies(companyPage, companySearch, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      setCompanies(result.data);
      setCompanyLastPage(Math.max(1, result.meta.lastPage));
      setCompanyLoading(false);
      setCompanyError("");
    }).catch((cause) => {
      if (controller.signal.aborted) return;
      setCompanyError(cause instanceof Error ? cause.message : "No se pudieron cargar las empresas.");
      setCompanyLoading(false);
    });
    return () => controller.abort();
  }, [chooserOpen, companyPage, companySearch, companyVersion]);

  useEffect(() => {
    if (!initialOrderId || !user.idClient) return;
    let active = true;
    getOrder(initialOrderId).then((order) => {
      if (active && order.idClient === user.idClient) setSelected(order);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [initialOrderId, user.idClient]);

  const selectedId = selected?.idOrder;
  useEffect(() => {
    if (!selectedId || !user.idClient || saving || editMode || addMode || paymentOpen || detailsLoading) return;
    const controller = new AbortController();
    getOrder(selectedId, controller.signal).then(fresh => {
      if (!controller.signal.aborted && fresh.idClient === user.idClient)
        setSelected(current => current?.idOrder === selectedId ? fresh : current);
    }).catch(() => undefined);
    return () => controller.abort();
  }, [selectedId, user.idClient, version, saving, editMode, addMode, paymentOpen, detailsLoading]);

  function reload() { setLoading(true); setVersion((value) => value + 1); }

  async function openOrder(order: Order) {
    setSelected(order);
    setDetailsLoading(true);
    setActionError("");
    setEditMode(false);
    setAddMode(false);
    setMapOpen(false);
    try {
      const fresh = await getOrder(order.idOrder);
      if (fresh.idClient !== user.idClient) throw new Error("Este pedido no pertenece a tu cuenta.");
      setSelected(fresh);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "No se pudo cargar el detalle.");
    } finally { setDetailsLoading(false); }
  }

  function addDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCart((items) => [...items, { ...draft }]);
    setDraft(blankDetail());
  }

  async function submitOrder() {
    if (!user.idClient || !company || cart.length === 0 || saving) return;
    setSaving(true);
    setActionError("");
    let orderId = pendingOrderId;
    try {
      if (orderId === null) {
        const order = await createOrder(user.idClient, company.idCompany);
        orderId = order.idOrder;
        setPendingOrderId(orderId);
      }
      for (const detail of cart) {
        await createDetail(orderId, detail);
        setCart((items) => items.slice(1));
      }
      setPendingOrderId(null);
      setCompany(null);
      setChooserOpen(false);
      setCart([]);
      setDraft(blankDetail());
      setNotice({ message: `Pedido #${orderId} creado correctamente.` });
      setPage(1);
      reload();
    } catch (cause) {
      setActionError(`${cause instanceof Error ? cause.message : "No se pudo crear el pedido."}${orderId ? ` El pedido #${orderId} ya existe. Corrige la carga y vuelve a pulsar «Enviar pedido» para continuar sin duplicarlo.` : ""}`);
      if (orderId) reload();
    } finally { setSaving(false); }
  }

  async function addToOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || selected.status !== "pendiente" || saving) return;
    setSaving(true);
    setActionError("");
    try {
      await createDetail(selected.idOrder, recoveryDraft);
      setSelected(await getOrder(selected.idOrder));
      setRecoveryDraft(blankDetail());
      setAddMode(false);
      setNotice({ message: `Carga añadida al pedido #${selected.idOrder}.` });
      reload();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "No se pudo añadir la carga.");
    } finally { setSaving(false); }
  }

  async function rejectPrice() {
    if (!selected || saving) return;
    setSaving(true); setActionError("");
    try {
      const updated = await respondPrice(selected.idOrder, false);
      setSelected(updated);
      setNotice({ message: "Cotización rechazada. La empresa podrá enviar una nueva propuesta.", tone: "danger" });
      reload();
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : "No se pudo responder a la cotización."); }
    finally { setSaving(false); }
  }

  async function pay(data: PaymentSubmission) {
    if (!selected || saving) return;
    setSaving(true); setActionError("");
    try {
      const updated = await simulatePayment(selected.idOrder, data);
      setSelected(updated);
      setPaymentOpen(false);
      setNotice({ message: "Pago simulado registrado correctamente." });
      reload();
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : "No se pudo registrar el pago."); }
    finally { setSaving(false); }
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const item = selected?.details?.find((detail) => !detail.deletedAt);
    if (!item || !selected || saving) return;
    setSaving(true); setActionError("");
    try {
      await updateDetail(item.idDetails, editDraft);
      const updated = await getOrder(selected.idOrder);
      setSelected(updated);
      setEditMode(false);
      setNotice({ message: "Carga actualizada correctamente." });
      reload();
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : "No se pudo actualizar la carga."); }
    finally { setSaving(false); }
  }

  async function removeDetail(id: number) {
    if (!selected || saving) return;
    setSaving(true); setActionError("");
    try {
      await deleteDetail(id);
      setSelected(await getOrder(selected.idOrder));
      setNotice({ message: "Carga eliminada del pedido.", tone: "danger" });
      reload();
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : "No se pudo eliminar la carga."); }
    finally { setSaving(false); }
  }

  const activeDetails = selected?.details?.filter((detail) => !detail.deletedAt) ?? [];
  const quotedAmount = activeDetails.reduce((sum, detail) => sum + Number(detail.amount || 0), 0);

  return <>
    <PageHeader eyebrow="DE PRINCIPIO A DESTINO" title="Mis pedidos" description="Solicita un envío, revisa cotizaciones y sigue cada carga desde un solo lugar."
      action={<button className={ui.primary} disabled={!user.idClient} onClick={() => { setChooserOpen(true); setCompanyLoading(true); }}><Icon name="plus" size={17} />Nuevo pedido</button>} />
    {!user.idClient && <p className={ui.notice}>Completa tu perfil de cliente para poder crear y consultar pedidos. <Link href="/client/profile">Ir a mi perfil</Link></p>}
    {notice && <TimedNotice message={notice.message} tone={notice.tone} onDismiss={() => setNotice(null)} />}
    {error && orders.length > 0 && !loading && <p className={ui.error} role="status">No se pudieron actualizar los pedidos. Se muestran los últimos datos disponibles.</p>}
    <section className={ui.card} aria-label="Listado de pedidos">
      <div className={styles.toolbar}><div className={styles.filters} role="group" aria-label="Filtrar pedidos">{orderFilters.map(({ value, label }) => <button key={value} type="button" className={filter === value ? styles.filterActive : ""} onClick={() => { if (filter === value) return; setFilter(value); setPage(1); setLoading(true); }} aria-pressed={filter === value}>{label}</button>)}</div>
        <button className={ui.secondary} onClick={reload} disabled={loading} aria-label="Actualizar pedidos"><Icon name="refresh" size={17} /></button></div>
      {loading || orders.length === 0 ? <DataState loading={loading} error={error} empty={filter === "all" ? "Aún no hay pedidos para mostrar." : "No hay pedidos en esta categoría."} onRetry={reload} /> :
        <div className={ui.tableWrap}><table className={ui.table}><thead><tr><th>Pedido</th><th>Empresa</th><th>Estado</th><th>Cargas</th><th>Fecha</th><th>Acción</th></tr></thead><tbody>{orders.map((order) => <tr key={order.idOrder}><td><strong>#{order.idOrder}</strong></td><td>{order.company?.businessName || `Empresa #${order.idCompany}`}</td><td><StatusBadge status={order.status} label={orderStatusLabels[order.status]} /></td><td>{order.details?.filter((item) => !item.deletedAt).length ?? "—"}</td><td>{formatDate(order.createdAt)}</td><td><ActionButton icon="eye" onClick={() => void openOrder(order)}>{order.details?.some(d => d.deliveryStatus === "awaiting_confirmation") ? "Confirmar recepción" : "Ver detalles"}</ActionButton></td></tr>)}</tbody></table></div>}
      <Pagination page={page} lastPage={lastPage} total={total} perPage={perPage} disabled={loading} onPage={(value) => { setPage(value); setLoading(true); }} onPerPage={(value) => { setPerPage(value); setPage(1); setLoading(true); }} />
    </section>
    {chooserOpen && <Modal title="Elige una empresa" eyebrow="TRAVELDLS · TU ESPACIO" onClose={() => setChooserOpen(false)}>
      <p className={ui.muted}>Encuentra una empresa de transporte para tu pedido.</p>
      {companyError && companies.length > 0 && !companyLoading && <p className={ui.error} role="status">No se pudieron actualizar las empresas. Se muestran los últimos datos disponibles.</p>}
      <form className={styles.companySearch} onSubmit={(event) => { event.preventDefault(); setCompanyPage(1); setCompanySearch(companyDraft.trim()); setCompanyVersion((value) => value + 1); setCompanyLoading(true); }}><input aria-label="Buscar empresa" placeholder="Buscar empresa…" value={companyDraft} onChange={(event) => setCompanyDraft(event.target.value)} /><button className={ui.secondary}>Buscar</button></form>
      {companyLoading || companies.length === 0 ? <DataState loading={companyLoading} error={companyError} empty="No se encontraron empresas." onRetry={() => { setCompanyLoading(true); setCompanyVersion((value) => value + 1); }} /> :
        <div className={styles.companyGrid}>{companies.map((item) => <CompanyChoiceCard key={item.idCompany} company={item} onSelect={() => { setCompany(item); setChooserOpen(false); setCart([]); setPendingOrderId(null); setActionError(""); }} />)}</div>}
      <div className={styles.companyPager}><button className={ui.secondary} disabled={companyPage <= 1} onClick={() => { setCompanyPage(companyPage - 1); setCompanyLoading(true); }}>Anterior</button><span>{companyPage} / {companyLastPage}</span><button className={ui.secondary} disabled={companyPage >= companyLastPage} onClick={() => { setCompanyPage(companyPage + 1); setCompanyLoading(true); }}>Siguiente</button></div>
    </Modal>}
    {company && <Modal title={`Pedido para ${company.businessName}`} eyebrow="TRAVELDLS · TU ESPACIO" busy={saving} onClose={() => setCompany(null)}>
      <p className={ui.muted}>Agrega una o varias cargas. Podrás revisar cada una antes de enviar tu solicitud.</p>
      <form className={ui.form} onSubmit={addDraft}>
        <DetailFields value={draft} onChange={setDraft} />
        <button className={ui.secondary} type="submit" disabled={saving}><Icon name="plus" size={16} />Añadir carga</button>
      </form>
      {cart.length > 0 && <section className={styles.cart} aria-label="Cargas del pedido"><div className={styles.cartHeading}><span className={styles.headingIcon}><Icon name="box" size={19} /></span><div><small>LISTAS PARA ENVIAR</small><h3>Cargas del pedido</h3></div><span className={styles.detailCount}>{cart.length} {cart.length === 1 ? "carga" : "cargas"}</span></div><div className={styles.detailList}>{cart.map((item, index) => <DetailCard key={index} eyebrow={`Carga ${String(index + 1).padStart(2, "0")}`} title={item.cargoDescription} facts={[
        { label: "Peso y embalaje", value: `${formatWeight(`${item.unitWeight} ${item.weightUnit}`)} · ${packagingTypes.find((type) => type.value === item.typePackaging)?.label || item.typePackaging}`, icon: "box" },
        { label: "Descripción y dirección de entrega", value: item.deliveryAddress, icon: "route", wide: true },
      ]}><ActionButton icon="trash" variant="danger" disabled={saving} onClick={() => setCart((items) => items.filter((_, position) => position !== index))}>Quitar carga</ActionButton></DetailCard>)}</div></section>}
      {actionError && <p className={ui.error} role="alert">{actionError}</p>}
      <div className={ui.actions}><button className={ui.secondary} disabled={saving} onClick={() => setCompany(null)}>Cancelar</button><button className={ui.primary} disabled={saving || cart.length === 0} onClick={() => void submitOrder()}>{saving ? "Enviando…" : "Enviar pedido"} <Icon name="arrow" size={16} /></button></div>
    </Modal>}
    {selected && !paymentOpen && !mapOpen && <Modal title={`Pedido #${selected.idOrder}`} eyebrow="TRAVELDLS · TU ESPACIO" busy={saving} onClose={() => { setSelected(null); setPaymentOpen(false); setEditMode(false); }}>
      <div className={styles.orderOverview}>
        <div className={styles.overviewStatus}><small>Estado del pedido</small><StatusBadge status={selected.status} label={orderStatusLabels[selected.status]} /></div>
        <div className={styles.overviewFact}><Icon name="building" size={18} /><span><small>Empresa</small><strong>{selected.company?.businessName || `Empresa #${selected.idCompany}`}</strong></span></div>
        <div className={styles.overviewFact}><Icon name="calendar" size={18} /><span><small>Fecha</small><strong>{formatDate(selected.createdAt)}</strong></span></div>
      </div>
      {detailsLoading ? <DataState loading empty="" /> : <>
        <div className={styles.detailHeading}><span className={styles.headingIcon}><Icon name="box" size={19} /></span><div><small>DETALLES DEL ENVÍO</small><h3>Cargas del pedido</h3></div><span className={styles.detailCount}>{activeDetails.length} {activeDetails.length === 1 ? "carga" : "cargas"}</span></div>
        {activeDetails.length ? <div className={styles.detailList}>{activeDetails.map((item, index) => {
          const weightLabel = formatWeight(item.unitWeight);
          return <DetailCard key={item.idDetails} eyebrow={`Carga ${String(index + 1).padStart(2, "0")}`} title={item.cargoDescription}
            amount={Number(item.amount) > 0 ? formatMoney(Number(item.amount)) : "Por cotizar"} amountLabel="Precio de transporte"
            facts={[
              { label: "Peso y embalaje", value: `${weightLabel} · ${packagingTypes.find((type) => type.value === item.typePackaging)?.label || item.typePackaging}`, icon: "box" },
              { label: "Conductor", value: item.driver ? item.driver.user?.name || item.driver.name || "Asignado" : "Aún sin asignar", icon: "user" },
              { label: "Descripción y dirección de entrega", value: item.deliveryAddress, icon: "route", wide: true },
            ]}>
            {selected.status === "pendiente" && activeDetails.length === 1 && <ActionButton icon="edit" onClick={() => {
              const weight = parseWeight(item.unitWeight);
              setEditDraft({ cargoDescription: item.cargoDescription, unitWeight: weight.quantity, weightUnit: weight.unit, deliveryAddress: item.deliveryAddress, typePackaging: item.typePackaging });
              setAddMode(false);
              setEditMode(true);
            }}>Editar carga</ActionButton>}
            {selected.status === "pendiente" && activeDetails.length > 1 && <ActionButton icon="trash" variant="danger" disabled={saving} onClick={() => void removeDetail(item.idDetails)}>Quitar carga</ActionButton>}
          </DetailCard>;
        })}</div> : <p className={ui.muted}>Este pedido aún no tiene cargas.</p>}
        {selected.status === "pendiente" && !addMode && <div className={styles.addDetailAction}><ActionButton icon="plus" onClick={() => { setRecoveryDraft(blankDetail()); setEditMode(false); setAddMode(true); setActionError(""); }}>Añadir carga al pedido</ActionButton></div>}
        {selected.status === "pendiente" && addMode && <form className={`${ui.form} ${styles.addDetailForm}`} onSubmit={(event) => void addToOrder(event)}><h3 className={styles.subhead}>Nueva carga para el pedido #{selected.idOrder}</h3><DetailFields value={recoveryDraft} onChange={setRecoveryDraft} /><div className={ui.actions}><button type="button" className={ui.secondary} disabled={saving} onClick={() => setAddMode(false)}>Cancelar</button><button className={ui.primary} disabled={saving}>{saving ? "Guardando…" : "Guardar carga"}</button></div></form>}
        {quotedAmount > 0 && <div className={styles.orderTotal}><span>Monto del pedido<small>Precio total del transporte</small></span><strong>{formatMoney(quotedAmount)}</strong></div>}
        {selected.status === "esperando_aprobacion" && <div className={styles.quote}><p>La empresa envió una cotización para todas tus cargas. Puedes rechazarla o completar un pago simulado para aceptar el pedido.</p><div className={ui.actions}><button className={ui.secondary} disabled={saving} onClick={() => void rejectPrice()}>Rechazar</button>{quotedAmount > 0 && <button className={ui.primary} disabled={saving} onClick={() => { setActionError(""); setPaymentOpen(true); }}>Pagar y aceptar</button>}</div></div>}
        {selected.status === "aceptado" && selected.payment?.status !== "pagado" && quotedAmount > 0 && <div className={styles.quote}><p>Este pedido fue aceptado sin pago. Registra el pago para que la empresa pueda asignar un conductor.</p><button className={ui.primary} disabled={saving} onClick={() => {setActionError("");setPaymentOpen(true);}}>Pagar pedido</button></div>}
        {selected.payment?.status === "pagado" && <p className={ui.notice}>Pago registrado: {selected.payment.referenceCode}</p>}
        {selected.details?.some(d => d.deliveryStatus === "in_transit") && <div className={styles.quote}><p>Sigue la ubicación que comparte el conductor durante el viaje.</p><ActionButton variant="primary" icon="route" onClick={() => setMapOpen(true)}>Ver mapa del pedido</ActionButton></div>}
      </>}
      {selected && <DeliveryPanel orderId={selected.idOrder} role="client" onChanged={()=>{void getOrder(selected.idOrder).then(setSelected);setVersion(v=>v+1);}} />}
      {editMode && <form className={ui.form} onSubmit={(event) => void saveEdit(event)}><h3 className={styles.subhead}>Editar carga</h3><DetailFields value={editDraft} onChange={setEditDraft} /><div className={ui.actions}><button type="button" className={ui.secondary} onClick={() => setEditMode(false)}>Cancelar</button><button className={ui.primary} disabled={saving}>Guardar cambios</button></div></form>}
      {actionError && <p className={ui.error} role="alert">{actionError}</p>}
      <div className={ui.actions}><button className={ui.secondary} disabled={saving} onClick={() => setSelected(null)}>Cerrar</button></div>
    </Modal>}
    {selected && mapOpen && <ClientTripMap order={selected} onClose={() => setMapOpen(false)} />}
    {selected && paymentOpen && <PaymentCheckout orderId={selected.idOrder}
      companyName={selected.company?.businessName || `Empresa #${selected.idCompany}`}
      details={activeDetails} amount={quotedAmount} billingEmail={user.email}
      busy={saving} error={actionError} acceptedWithoutPayment={selected.status === "aceptado"}
      onClose={() => { setPaymentOpen(false); setActionError(""); }} onPay={(data) => void pay(data)} />}
  </>;
}

function DetailFields({ value, onChange }: { value: NewDetail; onChange: (value: NewDetail) => void }) {
  const update = <K extends keyof NewDetail>(key: K, next: NewDetail[K]) => onChange({ ...value, [key]: next });
  return <><label className={ui.field}>Descripción de la carga<input value={value.cargoDescription} onChange={(event) => update("cargoDescription", event.target.value)} required minLength={3} maxLength={255} placeholder="Ej. cajas de repuestos" /></label>
    <div className={styles.weightFields}><label className={ui.field}>Peso de la carga<input type="number" min="0.01" step="any" value={value.unitWeight} onChange={(event) => update("unitWeight", event.target.value)} required placeholder="Ej. 25" /></label><div className={ui.field}><span>Unidad de medida</span><Select label="Unidad de medida" value={value.weightUnit} options={weightUnits} onChange={(next) => update("weightUnit", next as NewDetail["weightUnit"])} /></div></div>
    <label className={ui.field}>Descripción y dirección de entrega<textarea value={value.deliveryAddress} onChange={(event) => update("deliveryAddress", event.target.value)} required minLength={5} maxLength={255} rows={3} placeholder="Ciudad, barrio, dirección y referencias para encontrar el lugar" /></label>
    <div className={ui.field}><span>Embalaje</span><Select label="Tipo de embalaje" value={value.typePackaging} options={packagingTypes} onChange={(next) => update("typePackaging", next)} /></div>
    <p className={styles.priceNote}><Icon name="tag" size={16} />La empresa te enviará el precio del transporte para que lo revises antes de pagar.</p>
  </>;
}

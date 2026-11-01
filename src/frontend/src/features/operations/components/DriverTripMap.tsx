"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon/Icon";
import type { MapPoint } from "@/components/ui/TrackingMap/TrackingMap";
import { ActionButton, Modal, workspaceStyles as ui } from "@/components/ui/Workspace/Workspace";
import { NavigationMap } from "./NavigationMap";
import { distanceBetween, getRoadRoute, type RoadRoute } from "../services/routingApi";
import { api, type OperationalOrder } from "../services/operationsApi";
import styles from "./DriverTripMap.module.css";

export function DriverTripMap({ order, onClose }: { order: OperationalOrder; onClose: () => void }) {
  const [point, setPoint] = useState<MapPoint | null>(null);
  const [destinationPoint, setDestinationPoint] = useState<MapPoint | null>(null);
  const [choosingDestination, setChoosingDestination] = useState(false);
  const [route, setRoute] = useState<RoadRoute | null>(null);
  const [routeBusy, setRouteBusy] = useState(false);
  const [routeError, setRouteError] = useState("");
  const [sharing, setSharing] = useState(false);
  const [lastSent, setLastSent] = useState<Date | null>(null);
  const [error, setError] = useState("");
  const [gpsInfo, setGpsInfo] = useState<{ speed: number | null; accuracy: number; heading: number | null } | null>(null);
  const watch = useRef<number | null>(null);
  const sentAt = useRef(0);
  const sending = useRef(false);
  const routeAbort = useRef<AbortController | null>(null);
  const destinationRef = useRef<MapPoint | null>(null);
  const routeRequested = useRef(false);
  const routeOrigin = useRef<MapPoint | null>(null);
  const lastRouteAt = useRef(0);

  const calculateRoute = useCallback(async (origin: MapPoint, destination: MapPoint) => {
    routeOrigin.current = origin;
    lastRouteAt.current = Date.now();
    routeRequested.current = true;
    routeAbort.current?.abort();
    const controller = new AbortController();
    routeAbort.current = controller;
    setRouteBusy(true);
    setRouteError("");
    try {
      const next = await getRoadRoute(origin, destination, controller.signal);
      if (!controller.signal.aborted) setRoute(next);
    } catch (cause) {
      if (!controller.signal.aborted) {
        setRoute(null);
        setRouteError(cause instanceof Error ? cause.message : "No se pudo calcular la ruta.");
      }
    } finally {
      if (!controller.signal.aborted) setRouteBusy(false);
    }
  }, []);

  const stop = useCallback(() => {
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
    watch.current = null;
    setSharing(false);
  }, []);

  useEffect(() => () => {
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
    routeAbort.current?.abort();
  }, []);
  useEffect(() => {
    if (!order.details?.some(d => d.deliveryStatus === "in_transit") && watch.current !== null) {
      navigator.geolocation.clearWatch(watch.current);
      watch.current = null;
    }
  }, [order.details]);

  function start() {
    if (!navigator.geolocation) {
      setError("Este dispositivo no permite consultar su ubicación.");
      return;
    }
    if (!order.details?.some(d => d.deliveryStatus === "in_transit") || watch.current !== null) return;
    setError("");
    setLastSent(null);
    setSharing(true);
    watch.current = navigator.geolocation.watchPosition(position => {
      const next = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      setPoint(next);
      if (destinationRef.current && (!routeRequested.current ||
          (Date.now() - lastRouteAt.current >= 60_000 && routeOrigin.current && distanceBetween(next, routeOrigin.current) >= 150))) {
        void calculateRoute(next, destinationRef.current);
      }
      setGpsInfo({ speed: position.coords.speed, accuracy: position.coords.accuracy, heading: position.coords.heading });
      if (sending.current || Date.now() - sentAt.current < 15_000) return;
      sending.current = true;
      sentAt.current = Date.now();
      api(`/orders/${order.idOrder}/tracking`, "POST", next)
        .then(() => { setLastSent(new Date()); setError(""); })
        .catch(cause => setError(cause instanceof Error ? cause.message : "No se pudo enviar la ubicación."))
        .finally(() => { sending.current = false; });
    }, geolocationError => {
      setError(geolocationError.code === 1
        ? "Permite el acceso a tu ubicación en el navegador para compartir el viaje."
        : "No se pudo obtener tu ubicación. Revisa el GPS y la conexión.");
      stop();
    }, { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 });
  }

  function chooseDestination(next: MapPoint) {
    destinationRef.current = next;
    routeRequested.current = false;
    setDestinationPoint(next);
    setChoosingDestination(false);
    setRoute(null);
    if (point) {
      void calculateRoute(point, next);
    }
  }

  const isSharing = sharing && order.details?.some(d => d.deliveryStatus === "in_transit");
  const destination = [...new Set((order.details || []).map(detail => detail.deliveryAddress).filter(Boolean))].join(" · ");
  const speed = !isSharing || gpsInfo?.speed === null || gpsInfo?.speed === undefined || !Number.isFinite(gpsInfo.speed) ? "—" : String(Math.max(0, Math.round(gpsInfo.speed * 3.6)));
  const mapUrl = point
    ? `https://www.openstreetmap.org/?mlat=${point.latitude}&mlon=${point.longitude}#map=15/${point.latitude}/${point.longitude}`
    : "https://www.openstreetmap.org";
  return <Modal title={`Mapa del viaje #${order.idOrder}`} eyebrow="TU HOJA DE RUTA" size="map" onClose={onClose}>
    <div className={styles.navigation}>
      <NavigationMap point={point} destination={destinationPoint} heading={gpsInfo?.heading ?? null}
        route={route?.coordinates ?? null} choosingDestination={choosingDestination} onChooseDestination={chooseDestination} />
      <div className={styles.guidance}>
        <span className={styles.guidanceIcon}><Icon name="route" size={30} /></span>
        <div className={styles.guidanceText}>
          <small>{route ? `${(route.distanceMeters / 1000).toFixed(1)} km · ${Math.max(1, Math.round(route.durationSeconds / 60))} min estimados` : routeBusy ? "CALCULANDO RUTA" : order.details?.length === 1 ? "DESTINO DEL PEDIDO" : "DESTINOS DEL PEDIDO"}</small>
          <strong>{route?.firstRoad ? `Ruta por ${route.firstRoad}` : destination || "Consulta los detalles del pedido para ver el destino."}</strong>
          <span>{destinationPoint ? destination : "Marca el destino sobre el mapa para ver la ruta morada por carretera."}</span>
        </div>
        <span className={styles.tripNumber}>#{order.idOrder}</span>
      </div>
      <button type="button" className={styles.destinationButton} onClick={() => setChoosingDestination(value => !value)}>
        <Icon name="route" size={16} />{choosingDestination ? "Toca el punto de entrega" : destinationPoint ? "Cambiar destino" : "Marcar destino"}
      </button>
      <div className={styles.locationBadge} aria-live="polite"><span className={isSharing ? styles.liveDot : styles.idleDot} />{isSharing ? "GPS compartido" : point ? "GPS pausado" : "Esperando GPS"}</div>
      <div className={styles.navigationBottom}>
        <div className={styles.speedDial}><strong>{speed}</strong><span>km/h</span></div>
        <div className={styles.tripInfo}>
          <strong>{isSharing ? lastSent ? "Compartiendo ubicación" : "Buscando señal GPS…" : "Seguimiento detenido"}</strong>
          <span>{route ? `${(route.distanceMeters / 1000).toFixed(1)} km por carretera · ${Math.max(1, Math.round(route.durationSeconds / 60))} min estimados` : lastSent ? `Último envío: ${lastSent.toLocaleTimeString("es-NI")}` : "Activa el GPS para que el cliente pueda seguir el pedido."}</span>
          {gpsInfo && <small>Precisión ±{Math.round(gpsInfo.accuracy)} m{gpsInfo.heading !== null && Number.isFinite(gpsInfo.heading) ? ` · Dirección ${Math.round(gpsInfo.heading)}°` : ""}</small>}
          {destinationPoint && point && <button type="button" className={styles.recalculate} disabled={routeBusy} onClick={() => void calculateRoute(point, destinationPoint)}>Recalcular ruta</button>}
        </div>
        <div className={styles.actions}>
          {isSharing
            ? <ActionButton icon="route" onClick={stop}>Detener GPS</ActionButton>
            : <ActionButton icon="route" variant="primary" disabled={!order.details?.some(d => d.deliveryStatus === "in_transit")} onClick={start}>Iniciar GPS</ActionButton>}
        </div>
        <div className={styles.attribution}><span><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a>{route && " · Ruta: OSRM"}</span><a href={mapUrl} target="_blank" rel="noopener noreferrer">Abrir mapa ↗</a></div>
      </div>
    </div>
    {error && <p className={ui.error} role="alert">{error}</p>}
    {routeError && <p className={ui.error} role="status">{routeError}</p>}
  </Modal>;
}

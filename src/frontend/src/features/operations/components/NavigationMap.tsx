"use client";

import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MapPoint } from "@/components/ui/TrackingMap/TrackingMap";
import styles from "./NavigationMap.module.css";

type Props = {
  point: MapPoint | null;
  destination: MapPoint | null;
  heading: number | null;
  route: [number, number][] | null;
  choosingDestination: boolean;
  onChooseDestination: (point: MapPoint) => void;
};

const latLng = (point: MapPoint): [number, number] => [Number(point.latitude), Number(point.longitude)];

export function NavigationMap({ point, destination, heading, route, choosingDestination, onChooseDestination }: Props) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const leaflet = useRef<typeof Leaflet | null>(null);
  const driverMarker = useRef<Leaflet.Marker | null>(null);
  const destinationMarker = useRef<Leaflet.Marker | null>(null);
  const routeLayer = useRef<Leaflet.LayerGroup | null>(null);
  const choosingRef = useRef(choosingDestination);
  const chooseRef = useRef(onChooseDestination);
  const centered = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => { choosingRef.current = choosingDestination; chooseRef.current = onChooseDestination; }, [choosingDestination, onChooseDestination]);

  useEffect(() => {
    let active = true;
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    async function initialize() {
      const L = await import("leaflet");
      if (!active || !element.current) return;
      leaflet.current = L;
      const instance = L.map(element.current, { zoomControl: false, attributionControl: false })
        .setView([12.5, -85.1], 7);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors",
      }).addTo(instance);
      instance.on("click", event => {
        if (choosingRef.current) chooseRef.current({ latitude: event.latlng.lat, longitude: event.latlng.lng });
      });
      map.current = instance;
      setReady(true);
      resizeTimer = setTimeout(() => instance.invalidateSize(), 150);
    }
    void initialize();
    return () => {
      active = false;
      if (resizeTimer) clearTimeout(resizeTimer);
      map.current?.remove();
      map.current = null;
      leaflet.current = null;
      driverMarker.current = null;
      destinationMarker.current = null;
      routeLayer.current = null;
    };
  }, []);

  useEffect(() => {
    const L = leaflet.current;
    const instance = map.current;
    if (!ready || !L || !instance || !point) return;
    const position = latLng(point);
    const rotation = Number.isFinite(heading) ? Number(heading) : 0;
    const icon = L.divIcon({ className: "", iconSize: [54, 54], iconAnchor: [27, 27],
      html: `<span class="${styles.driverMarker}" style="transform:rotate(${rotation}deg)"><svg viewBox="0 0 28 28" aria-hidden="true"><path d="M14 2 25 25 14 20 3 25Z"/></svg></span>` });
    if (driverMarker.current) driverMarker.current.setLatLng(position).setIcon(icon);
    else driverMarker.current = L.marker(position, { icon, title: "Ubicación del conductor", alt: "Ubicación del conductor" }).addTo(instance);
    if (!centered.current) { instance.setView(position, 15); centered.current = true; }
    else if (route?.length) instance.panTo(position, { animate: true, duration: 0.6 });
  }, [ready, point, heading, route]);

  useEffect(() => {
    const L = leaflet.current;
    const instance = map.current;
    if (!ready || !L || !instance) return;
    if (destinationMarker.current) { instance.removeLayer(destinationMarker.current); destinationMarker.current = null; }
    if (!destination) return;
    const icon = L.divIcon({ className: "", iconSize: [42, 50], iconAnchor: [21, 47],
      html: `<span class="${styles.destinationMarker}"><svg viewBox="0 0 32 40" aria-hidden="true"><path d="M16 2C8.3 2 2 8.3 2 16c0 11 14 22 14 22s14-11 14-22C30 8.3 23.7 2 16 2Z"/><circle cx="16" cy="16" r="5"/></svg></span>` });
    destinationMarker.current = L.marker(latLng(destination), { icon, title: "Destino seleccionado", alt: "Destino seleccionado" }).addTo(instance);
  }, [ready, destination]);

  useEffect(() => {
    const L = leaflet.current;
    const instance = map.current;
    if (!ready || !L || !instance) return;
    if (routeLayer.current) { instance.removeLayer(routeLayer.current); routeLayer.current = null; }
    if (!route?.length) return;
    const points = route.map(([longitude, latitude]): [number, number] => [latitude, longitude]);
    routeLayer.current = L.layerGroup([
      L.polyline(points, { color: "#f0dbff", weight: 13, opacity: 0.85, interactive: false }),
      L.polyline(points, { color: "#6820c8", weight: 8, opacity: 0.98, interactive: false }),
    ]).addTo(instance);
    const bounds = L.latLngBounds(points);
    instance.fitBounds(bounds, { paddingTopLeft: [35, 145], paddingBottomRight: [35, 185], maxZoom: 16 });
  }, [ready, route]);

  return <div ref={element} className={`${styles.map} ${choosingDestination ? styles.choosing : ""}`} aria-label="Mapa interactivo del viaje" />;
}

"use client";

import styles from "./TrackingMap.module.css";

export type MapPoint = { latitude: number | string; longitude: number | string };

export function TrackingMap({ point, label, navigation = false }: { point: MapPoint | null; label: string; navigation?: boolean }) {
  const valid = point && Number.isFinite(Number(point.latitude)) && Number.isFinite(Number(point.longitude))
    && Math.abs(Number(point.latitude)) <= 90 && Math.abs(Number(point.longitude)) <= 180;
  const latitude = valid ? Number(point.latitude) : 12.5;
  const longitude = valid ? Number(point.longitude) : -85.1;
  const span = valid ? 0.025 : 2.5;
  const bbox = [longitude - span, latitude - span * 0.6, longitude + span, latitude + span * 0.6]
    .map(value => value.toFixed(5)).join(",");
  const marker = valid ? `&marker=${latitude.toFixed(5)},${longitude.toFixed(5)}` : "";
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik${marker}`;
  const externalUrl = valid
    ? `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=15/${latitude}/${longitude}`
    : "https://www.openstreetmap.org";

  return <div className={styles.frame} data-variant={navigation ? "navigation" : undefined}>
    <iframe title={label} src={src} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" />
    {!navigation && <div className={styles.footer}>
      <span>{valid ? label : "Mapa de Nicaragua · esperando ubicación"}</span>
      <a href={externalUrl} target="_blank" rel="noopener noreferrer">Abrir en OpenStreetMap ↗</a>
    </div>}
  </div>;
}

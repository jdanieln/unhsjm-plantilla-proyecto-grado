import type { MapPoint } from "@/components/ui/TrackingMap/TrackingMap";

export type RoadRoute = {
  coordinates: [number, number][]; // [longitude, latitude] as returned by GeoJSON
  distanceMeters: number;
  durationSeconds: number;
  firstRoad: string | null;
};

type OsrmResponse = {
  code?: string;
  routes?: Array<{
    distance?: number;
    duration?: number;
    geometry?: { coordinates?: [number, number][] };
    legs?: Array<{ steps?: Array<{ name?: string }> }>;
  }>;
};

const demoBase = "https://router.project-osrm.org";

export function distanceBetween(a: MapPoint, b: MapPoint): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDifference = radians(Number(b.latitude) - Number(a.latitude));
  const longitudeDifference = radians(Number(b.longitude) - Number(a.longitude));
  const latitudeA = radians(Number(a.latitude));
  const latitudeB = radians(Number(b.latitude));
  const arc = Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(longitudeDifference / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.min(1, Math.sqrt(arc)));
}

export async function getRoadRoute(origin: MapPoint, destination: MapPoint, signal?: AbortSignal): Promise<RoadRoute> {
  const configuredBase = process.env.NEXT_PUBLIC_ROUTING_API_URL?.replace(/\/+$/, "");
  const base = configuredBase || (process.env.NODE_ENV === "production" ? "" : demoBase);
  if (!base) throw new Error("El cálculo de rutas no está disponible en este entorno.");

  const coordinates = [origin, destination]
    .map(point => `${Number(point.longitude).toFixed(6)},${Number(point.latitude).toFixed(6)}`)
    .join(";");
  const response = await fetch(`${base}/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=true`, { signal });
  if (!response.ok) throw new Error("No se pudo calcular la ruta por carretera.");
  const result = await response.json() as OsrmResponse;
  const route = result.routes?.[0];
  if (result.code !== "Ok" || !route?.geometry?.coordinates || route.geometry.coordinates.length < 2 ||
      !route.geometry.coordinates.every(point => point.length === 2 && point.every(Number.isFinite)) ||
      !Number.isFinite(route.distance) || !Number.isFinite(route.duration)) {
    throw new Error("No se encontró una ruta por carretera entre estos puntos.");
  }

  return {
    coordinates: route.geometry.coordinates,
    distanceMeters: route.distance!,
    durationSeconds: route.duration!,
    firstRoad: route.legs?.[0]?.steps?.find(step => step.name)?.name || null,
  };
}

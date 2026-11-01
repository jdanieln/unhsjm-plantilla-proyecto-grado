import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../src/features/operations/services/routingApi.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText;
const { getRoadRoute, distanceBetween } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test("solicita una ruta por calles con longitud antes de latitud", async () => {
  globalThis.fetch = async (url) => {
    assert.match(url, /\/route\/v1\/driving\/-86\.250000,12\.100000;-86\.240000,12\.110000\?/);
    return Response.json({ code: "Ok", routes: [{ distance: 2400, duration: 300,
      geometry: { coordinates: [[-86.25, 12.1], [-86.245, 12.105], [-86.24, 12.11]] },
      legs: [{ steps: [{ name: "" }, { name: "Avenida Central" }] }],
    }] });
  };
  const route = await getRoadRoute({ latitude: 12.1, longitude: -86.25 }, { latitude: 12.11, longitude: -86.24 });
  assert.equal(route.distanceMeters, 2400);
  assert.equal(route.firstRoad, "Avenida Central");
  assert.deepEqual(route.coordinates[1], [-86.245, 12.105]);
});

test("no dibuja rutas cuando el proveedor no encuentra calles", async () => {
  globalThis.fetch = async () => Response.json({ code: "NoRoute", routes: [] });
  await assert.rejects(getRoadRoute({ latitude: 12.1, longitude: -86.25 }, { latitude: 12.11, longitude: -86.24 }), /No se encontró una ruta/);
});

test("la distancia entre posiciones se calcula en metros", () => {
  assert.equal(distanceBetween({ latitude: 12, longitude: -86 }, { latitude: 12, longitude: -86 }), 0);
  assert.ok(distanceBetween({ latitude: 12, longitude: -86 }, { latitude: 12.001, longitude: -86 }) > 100);
});

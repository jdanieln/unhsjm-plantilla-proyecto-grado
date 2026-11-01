import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

// Ejecuta los servicios TypeScript sin un navegador ni conexión con la base de datos.
const source = await readFile(
  new URL("../src/features/admin/services/adminApi.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  },
}).outputText;
const { adminRequest, allRows, saveResource, ApiError } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);
const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("envía cookies y convierte las relaciones del camión a números", async () => {
  let captured;
  globalThis.fetch = async (url, init) => {
    captured = { url, init };
    return Response.json({ idTruck: 12 });
  };
  const form = new FormData();
  form.set("plate", "M123456");
  form.set("idCompany", "8");
  form.set("idDriver", "9");
  form.set("idCategory", "2");
  await saveResource("trucks", form, "12");
  assert.equal(new URL(captured.url).pathname, "/api/trucks/12");
  assert.equal(captured.init.method, "PUT");
  assert.equal(captured.init.credentials, "include");
  assert.equal(captured.init.cache, "no-store");
  assert.deepEqual(JSON.parse(captured.init.body), {
    plate: "M123456",
    idCompany: 8,
    idDriver: 9,
    idCategory: 2,
  });
});

test("conserva multipart y la fotografía en los perfiles", async () => {
  const form = new FormData();
  form.set("businessName", "Transportes");
  form.set("photo", new Blob(["image"], { type: "image/png" }), "photo.png");
  globalThis.fetch = async (_url, init) => {
    assert.equal(init.body, form);
    assert.equal(init.headers["Content-Type"], undefined);
    return Response.json({});
  };
  await saveResource("companies", form);
});

test("crea cuentas con el rol recibido del servidor mediante /register", async () => {
  globalThis.fetch = async (url, init) => {
    assert.equal(new URL(url).pathname, "/api/register");
    assert.equal(init.method, "POST");
    assert.equal(JSON.parse(init.body).roleId, 42);
    return Response.json({});
  };
  const form = new FormData();
  form.set("roleId", "42");
  form.set("email", "cuenta@example.test");
  await saveResource("users", form);
});

test("carga todas las páginas para las opciones de los formularios", async () => {
  const pages = [];
  globalThis.fetch = async (url) => {
    const page = Number(new URL(url).searchParams.get("page"));
    pages.push(page);
    return Response.json({
      data: [{ idCompany: page }],
      meta: { lastPage: 3 },
    });
  };
  assert.deepEqual(await allRows("companies"), [
    { idCompany: 1 },
    { idCompany: 2 },
    { idCompany: 3 },
  ]);
  assert.deepEqual(pages, [1, 2, 3]);
});

test("muestra los errores de validación sin dar la operación por guardada", async () => {
  globalThis.fetch = async () =>
    Response.json(
      { errors: [{ message: "Correo ya registrado" }] },
      { status: 422 },
    );
  await assert.rejects(
    adminRequest("/register"),
    (error) =>
      error instanceof ApiError &&
      error.status === 422 &&
      error.message === "Correo ya registrado",
  );
});

test("distingue permisos, sesión expirada y fallo de conexión", async () => {
  for (const status of [401, 403]) {
    globalThis.fetch = async () => Response.json({}, { status });
    await assert.rejects(
      adminRequest("/users"),
      (error) => error instanceof ApiError && error.status === status,
    );
  }
  globalThis.fetch = async () => {
    throw new TypeError("Failed to fetch");
  };
  await assert.rejects(
    adminRequest("/users"),
    (error) => error instanceof ApiError && error.status === 0,
  );
});

test("respeta la cancelación al salir de un panel", async () => {
  const controller = new AbortController();
  controller.abort();
  globalThis.fetch = async (_url, init) => {
    init.signal.throwIfAborted();
  };
  await assert.rejects(adminRequest("/users", { signal: controller.signal }), {
    name: "AbortError",
  });
});

import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
async function load(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
  return import("data:text/javascript;base64," + Buffer.from(output).toString("base64"));
}
const { api, allPages, OperationsError } = await load("../src/features/operations/services/operationsApi.ts");
const { getRoleDestination } = await load("../src/features/auth/utils/roleNavigation.ts");
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
test("empresa y conductor abren sus paneles internos en Next", () => {
  assert.equal(getRoleDestination("company"), "/company/dashboard");
  assert.equal(getRoleDestination("driver"), "/driver/dashboard");
  assert.equal(getRoleDestination("client"), "/client/dashboard");
  assert.equal(getRoleDestination("platform_admin"), "/admin/dashboard");
});
test("la carga completa conserva el filtro de empresa en cada página", async () => {
  const pages = [];
  globalThis.fetch = async (url, init) => {
    const query = new URL(url).searchParams;
    assert.equal(query.get("idCompany"), "7");
    assert.equal(init.credentials, "include");
    const page = Number(query.get("page")); pages.push(page);
    return Response.json({ data: [{ idOrder: page }], meta: { lastPage: 3 } });
  };
  assert.deepEqual(await allPages("/orders?idCompany=7"), [{idOrder:1},{idOrder:2},{idOrder:3}]);
  assert.deepEqual(pages, [1,2,3]);
});
test("los formularios con foto conservan multipart y las cookies", async () => {
  const form = new FormData(); form.set("license", "ABC123");
  globalThis.fetch = async (url, init) => {
    assert.equal(new URL(url).pathname, "/api/drivers/4");
    assert.equal(init.method, "PUT"); assert.equal(init.body, form);
    assert.equal(init.headers["Content-Type"], undefined);
    assert.equal(init.credentials, "include");
    return Response.json({idDriver:4});
  };
  await api("/drivers/4", "PUT", form);
});
test("muestra errores de validación y no interpreta un rechazo como éxito", async () => {
  globalThis.fetch = async () => Response.json({ errors: [{message:"Licencia inválida"}] }, {status:422});
  await assert.rejects(api("/drivers", "POST", {}), error => error instanceof OperationsError && error.status===422 && error.message==="Licencia inválida");
});

import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../src/features/client/services/clientApi.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText;
const { createDetail, updateDetail, getOrders, saveProfile, simulatePayment, ClientApiError } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test("crea la carga sin precio hasta que la empresa la cotice y conserva la unidad", async () => {
  globalThis.fetch = async (url, init) => {
    assert.equal(new URL(url).pathname, "/api/order-details");
    assert.equal(init.credentials, "include");
    assert.deepEqual(JSON.parse(init.body), {
      idOrder: 14,
      cargoDescription: "Repuestos",
      unitWeight: "25 t",
      amount: 0,
      quantity: 1,
      deliveryAddress: "Managua centro",
      typePackaging: "caja",
    });
    return Response.json({ idDetails: 7 });
  };
  await createDetail(14, {
    cargoDescription: "Repuestos", unitWeight: "25", weightUnit: "t",
    deliveryAddress: "Managua centro", typePackaging: "caja",
  });
});

test("edita peso y embalaje sin alterar la cotización", async () => {
  globalThis.fetch = async (url, init) => {
    assert.equal(new URL(url).pathname, "/api/order-details/7");
    assert.deepEqual(JSON.parse(init.body), {
      cargoDescription: "Repuestos", unitWeight: "12 kg",
      deliveryAddress: "Managua centro", typePackaging: "pallet",
    });
    return Response.json({ idDetails: 7 });
  };
  await updateDetail(7, {
    cargoDescription: "Repuestos", unitWeight: "12", weightUnit: "kg",
    deliveryAddress: "Managua centro", typePackaging: "pallet",
  });
});

test("no crea cargas con peso inválido", async () => {
  globalThis.fetch = () => { throw new Error("No debe llamar al backend"); };
  assert.throws(() => createDetail(14, {
    cargoDescription: "Repuestos", unitWeight: "0", weightUnit: "kg",
    deliveryAddress: "Managua centro", typePackaging: "caja",
  }), /peso válido/);
});

test("consulta solo los pedidos del cliente y conserva multipart del perfil", async () => {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: new URL(url), init });
    return Response.json({ data: [], meta: { total: 0, lastPage: 1 } });
  };
  await getOrders(9, 2, 25);
  assert.equal(calls[0].url.searchParams.get("idClient"), "9");
  assert.equal(calls[0].url.searchParams.get("page"), "2");
  assert.equal(calls[0].url.searchParams.get("perPage"), "25");
  const form = new FormData();
  form.set("companyName", "Cliente");
  await saveProfile(null, form);
  assert.equal(calls[1].url.pathname, "/api/clients");
  assert.equal(calls[1].init.body, form);
  assert.equal(calls[1].init.headers["Content-Type"], undefined);
});

test("simula el pago solo por la ruta del pedido y muestra errores de validación", async () => {
  globalThis.fetch = async (url, init) => {
    assert.equal(new URL(url).pathname, "/api/orders/18/payments/simulate");
    assert.equal(JSON.parse(init.body).method, "transfer");
    return Response.json({ errors: [{ message: "Referencia requerida" }] }, { status: 422 });
  };
  await assert.rejects(
    simulatePayment(18, { method: "transfer", billingEmail: "cliente@example.test", transferReference: "ABC123" }),
    (error) => error instanceof ClientApiError && error.status === 422 && error.message === "Referencia requerida",
  );
});

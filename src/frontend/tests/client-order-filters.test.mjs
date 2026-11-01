import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../src/features/client/types/client.ts", import.meta.url), "utf8");
const standaloneSource = source.replace(/export \{ formatDate, formatMoney \} from "@\/lib\/format";/, "");
const compiled = ts.transpileModule(standaloneSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText;
const { matchesOrderFilter } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);

test("finalizados incluye entregados y separa cancelados y rechazados", () => {
  const statuses = ["entregado", "cancelado", "anulado", "denegado", "pendiente"];
  assert.deepEqual(statuses.filter((status) => matchesOrderFilter(status, "entregado")), ["entregado"]);
  assert.deepEqual(statuses.filter((status) => matchesOrderFilter(status, "cancelled")), [
    "cancelado", "anulado", "denegado",
  ]);
});

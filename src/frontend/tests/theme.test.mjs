import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";

const source = await readFile(new URL("../src/components/ui/ThemeToggle/theme.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
} }).outputText;

function environment(saved, blocked = false) {
  const storage = new Map(saved ? [["traveldls-theme", saved]] : []);
  const document = { documentElement: { dataset: {} } };
  const window = new EventTarget();
  const context = { exports: {}, document, window, Event, localStorage: {
    getItem(key) { if (blocked) throw Error("Storage unavailable"); return storage.get(key) ?? null; },
    setItem(key, value) { if (blocked) throw Error("Storage unavailable"); storage.set(key, value); },
  } };
  vm.createContext(context);
  vm.runInContext(compiled, context);
  vm.runInContext(context.exports.themeInitializationScript, context);
  return { ...context, storage, theme: context.exports };
}

test("inicia oscuro y restaura solo preferencias válidas antes del primer render", () => {
  for (const [stored, expected] of [[undefined, "dark"], ["light", "light"], ["dark", "dark"], ["invalid", "dark"]]) {
    assert.equal(environment(stored).theme.getTheme(), expected);
  }
});

test("cambiar tema notifica a los controles y persiste la preferencia", () => {
  const env = environment();
  let changes = 0;
  const unsubscribe = env.theme.subscribeToTheme(() => changes++);
  env.theme.setTheme("light");
  assert.equal(env.theme.getTheme(), "light");
  assert.equal(env.storage.get(env.theme.THEME_KEY), "light");
  assert.equal(changes, 1);
  unsubscribe();
  env.theme.setTheme("dark");
  assert.equal(changes, 1);
});

test("funciona aunque el navegador bloquee el almacenamiento", () => {
  const env = environment("light", true);
  assert.equal(env.theme.getTheme(), "dark");
  env.theme.setTheme("light");
  assert.equal(env.theme.getTheme(), "light");
});

test("sincroniza otras pestañas e ignora cambios de otras preferencias", () => {
  const env = environment();
  let changes = 0;
  env.theme.subscribeToTheme(() => changes++);
  for (const [key, newValue, expected] of [["other", "light", "dark"], [env.theme.THEME_KEY, "light", "light"], [null, null, "dark"]]) {
    const event = new Event("storage");
    Object.assign(event, { key, newValue });
    env.window.dispatchEvent(event);
    assert.equal(env.theme.getTheme(), expected);
  }
  assert.equal(changes, 2);
});

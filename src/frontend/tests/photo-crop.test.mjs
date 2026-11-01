import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../src/components/ui/PhotoUpload/cropImage.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText;
const { cropBounds, moveCropCenter } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);

test("el recorte cuadrado permanece dentro de imágenes horizontales y verticales", () => {
  for (const [width, height] of [[1600, 900], [900, 1600]]) {
    for (const center of [{ x: -1, y: -1 }, { x: 2, y: 2 }]) {
      const crop = cropBounds(width, height, 1.5, center);
      assert.ok(crop.x >= 0 && crop.y >= 0);
      assert.ok(crop.x + crop.side <= width && crop.y + crop.side <= height);
    }
  }
});

test("arrastrar la imagen limita el centro sin salir del encuadre", () => {
  const moved = moveCropCenter(1200, 800, 2, { x: 0.5, y: 0.5 }, 10, -10);
  const crop = cropBounds(1200, 800, 2, moved);
  assert.equal(crop.x, 0);
  assert.equal(crop.y + crop.side, 800);
});

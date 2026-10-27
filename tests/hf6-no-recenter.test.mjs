import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const view = readFileSync(new URL("../src/View.tsx", import.meta.url), "utf8");

test("HF6: every image occupies symmetric bounds around a fixed viewport origin", () => {
  assert.match(view, /const width = image\.naturalWidth \* scale;/);
  assert.match(view, /const height = image\.naturalHeight \* scale;/);
  assert.match(view, /\[-height \/ 2, -width \/ 2\]/);
  assert.match(view, /\[height \/ 2, width \/ 2\]/);
  assert.match(view, /instance\.setView\(\[0, 0\], 0, \{ animate: false \}\)/);
  assert.doesNotMatch(view, /instance\.fitBounds\(/);
});

test("HF6: resize and double click still reset image fit; new layer is centered before insertion", () => {
  assert.match(view, /instance\.on\("dblclick",/);
  assert.match(view, /const observer = new ResizeObserver/);
  assert.match(view, /current\.layer\.setBounds\(boundsFor\(current\.image, node\)\)/);
  const fit = view.indexOf("fitImage(instance, requested, node);");
  const add = view.indexOf("layer.addTo(instance);");
  const remove = view.indexOf("old?.layer.remove();");
  assert.ok(fit >= 0 && fit < add && add < remove, "center, add, remove in one synchronous swap");
  assert.ok(view.indexOf("await requested.decode()") < fit, "decode offscreen first");
  assert.match(view, /zoomAnimation: false, fadeAnimation: false/);
  assert.equal((view.match(/L\.map\(node,/g) ?? []).length, 1);
});

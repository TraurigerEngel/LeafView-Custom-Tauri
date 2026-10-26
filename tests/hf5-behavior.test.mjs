import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = file => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("HF5: lower toolbar appears earlier and stays reachable", () => {
  const app = read("src/App.tsx");
  const css = read("src/ToolBar.scss");
  assert.match(app, /distance <= 64/);
  assert.match(app, /wasVisible && distance <= 128/);
  assert.match(app, /window\.addEventListener\("pointermove", onMove/);
  assert.match(css, /\.bottom\[data-visible="true"\] \.toolbar/);
  assert.match(css, /pointer-events: none;/);
});

test("HF5: image replacement is instantaneous, without Leaflet fade or zoom-slide", () => {
  const view = read("src/View.tsx");
  assert.match(view, /zoomAnimation: false, fadeAnimation: false/);
  assert.match(view, /fitBounds\(bounds, \{ animate: false \}\)/);
  assert.match(view, /instance\.setView\([^;]*\{ animate: false \}\)/s);
  assert.ok(view.indexOf("await requested.decode()") < view.indexOf("layer.addTo(instance)"));
  assert.ok(view.indexOf("layer.addTo(instance)") < view.indexOf("old?.layer.remove()"));
  assert.equal((view.match(/L\.map\(node,/g) || []).length, 1);
});

test("HF5: window starts maximized while retaining native title and F11", () => {
  const config = JSON.parse(read("src-tauri/tauri.conf.json"));
  const main = config.app.windows.find(w => w.label === "main");
  assert.ok(main, "Main window config exists");
  assert.equal(main.maximized, true);
  assert.notEqual(main.fullscreen, true, "Do not hide native title by starting in kiosk fullscreen");
  assert.notEqual(main.decorations, false);
  const app = read("src/App.tsx");
  assert.match(app, /getCurrentWindow\(\)\.setTitle\(title\)/);
  assert.match(app, /e\.key === "F11"/);
  assert.match(app, /e\.key === "Escape"/);
});

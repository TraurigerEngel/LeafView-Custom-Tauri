import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
test("Tauri config and security", () => {
 const config = JSON.parse(read("src-tauri/tauri.conf.json"));
 assert.equal(config.version, "0.1.2");
 assert.equal(config.app.security.assetProtocol.enable, true);
 assert.deepEqual(config.app.security.assetProtocol.scope, []);
 assert.ok(config.bundle.fileAssociations[0].ext.includes("png"));
 assert.ok(!read("src-tauri/capabilities/default.json").includes("fs:write-all"));
});
test("Bottom toolbar reveals sooner and stays accessible", () => {
 const css = read("src/ToolBar.scss");
 const app = read("src/App.tsx");
 const bar = read("src/ToolBar.tsx");
 assert.match(css, /opacity: 0;/);
 assert.match(css, /\.bottom\[data-visible="true"\] \.toolbar/);
 assert.match(css, /\.bottom:has\(\.icon:focus-visible\) \.toolbar/);
 assert.doesNotMatch(css, /\.bottom:focus-within/);
 assert.doesNotMatch(css, /\.bottom:hover \.toolbar/);
 assert.match(app, /distance <= 64/);
 assert.match(app, /wasVisible && distance <= 128/);
 assert.match(app, /window\.addEventListener\("pointermove", onMove/);
 assert.match(bar, /data-visible=\{props\.visible/);
});
test("Native title contains filename and position; no image-covering status overlay", () => {
 const app = read("src/App.tsx");
 const css = read("src/App.scss");
 assert.match(app, /fileName\(path\)\}\$\{position\} — LeafView Custom/);
 assert.match(app, /index \+ 1}\/\$\{files.length\}/);
 assert.match(app, /getCurrentWindow\(\)\.setTitle\(title\)/);
 assert.match(app, /\[path, files\]/);
 assert.doesNotMatch(app, /className="image-status"/);
 assert.doesNotMatch(css, /\.image-status/);
});
test("Arrow navigation stops at boundaries without rescanning", () => {
 const app = read("src/App.tsx");
 assert.match(app, /window\.addEventListener\("keydown", onKey, true\)/);
 assert.match(app, /\["ArrowLeft", "ArrowRight", "PageUp", "PageDown"\]/);
 assert.match(app, /currentIndex \+ shift/);
 assert.match(app, /target < 0 \|\| target >= list\.length/);
 assert.doesNotMatch(app, /% list\.length/);
 assert.match(app, /canPrev=\{canPrev\} canNext=\{canNext\}/);
 const toolbar = read("src/ToolBar.tsx");
 assert.match(toolbar, /disabled=\{!props\.canPrev\}/);
 assert.match(toolbar, /disabled=\{!props\.canNext\}/);
 assert.match(read("src/View.tsx"), /keyboard: false/);
});
test("Protected trash + native drop + single-instance arguments", () => {
 const app = read("src/App.tsx");
 assert.ok(app.indexOf("await confirmDelete(") < app.indexOf("await moveToTrash("));
 assert.match(app, /role="alertdialog"/);
 assert.match(app, /answerDelete\(true\)/);
 assert.doesNotMatch(app, /await ask\(/);
 assert.match(app, /\.onDragDropEvent/);
 const rust = read("src-tauri/src/lib.rs");
 assert.match(rust, /tauri_plugin_single_instance::init/);
 assert.match(rust, /trash::delete/);
 assert.match(rust, /allow_directory\(parent, false\)/);
});
test("Expected sources, no Electron runtime dependencies", () => {
 const pkg = JSON.parse(read("package.json"));
 assert.ok(pkg.dependencies["@tauri-apps/api"]);
 assert.equal(pkg.dependencies.electron, undefined);
 for (const f of ["src/View.tsx","src/Grid.tsx","src/ToolBar.tsx","src-tauri/src/lib.rs","BUILD-WINDOWS.cmd"]) assert.ok(existsSync(new URL(`../${f}`, import.meta.url)));
});

test("Esc closes Tauri app globally", () => {
 const app = read("src/App.tsx");
 const cap = JSON.parse(read("src-tauri/capabilities/default.json"));
 assert.match(app, /e\.key === "Escape"/);
 assert.match(app, /getCurrentWindow\(\)\.close\(\)/);
 assert.doesNotMatch(app, /e\.key === "Escape" && \(grid \|\| context\)/);
 assert.ok(cap.permissions.includes("core:window:allow-close"));
});
test("Viewer maintains a stable map and decodes before replacing the visible layer", () => {
 const view = read("src/View.tsx");
 assert.match(view, /L\.map\(node,/);
 assert.match(view, /useEffect\(\(\) => \{/);
 assert.match(view, /await requested\.decode\(\)/);
 assert.match(view, /L\.imageOverlay\(requested as unknown as string, bounds\)/);
 assert.match(view, /layer\.addTo\(instance\)/);
 assert.match(view, /old\?\.layer\.remove\(\)/);
 assert.ok(view.indexOf("layer.addTo(instance)") < view.indexOf("old?.layer.remove()"));
 assert.match(view, /Keep the displayed Leaflet layer intact/);
 assert.equal((view.match(/instance\.remove\(\)/g)||[]).length, 1);
});

// Build regression: Leaflet's setBounds expects bounds, not another latLngBounds call.
test("Leaflet bounds are passed directly without incompatible overload", () => {
 const view = read("src/View.tsx");
 assert.match(view, /current\.layer\.setBounds\(boundsFor\(current\.image, node\)\)/);
 assert.doesNotMatch(view, /L\.latLngBounds\(boundsFor\(current\.image, node\)\)/);
});

test("Windows CMD entrypoints use native line breaks without UTF-8 BOM", () => {
 for (const name of ["BUILD-WINDOWS.cmd", "BUILD-PORTABLE-ONLY.cmd"]) {
  const bytes = readFileSync(new URL(`../${name}`, import.meta.url));
  assert.equal(bytes.subarray(0, 5).toString("ascii"), "@echo", name);
  assert.equal(bytes[0], 0x40, name);
  assert.ok(bytes.includes(Buffer.from("\r\n")), name);
 }
});

// HF2: setBounds requires a concrete LatLngBounds, not LatLngBoundsExpression.
// Verify both the declared return type and the constructor in the source.
test("Leaflet geometry returns the concrete LatLngBounds required by setBounds", () => {
  const view = read("src/View.tsx");
  assert.match(view, /const boundsFor = \(image: HTMLImageElement, node: HTMLElement\): L\.LatLngBounds =>/);
  assert.match(view, /return L\.latLngBounds\(/);
  assert.doesNotMatch(view, /boundsFor[^\n]*LatLngBoundsExpression/);
  assert.match(view, /current\.layer\.setBounds\(boundsFor\(current\.image, node\)\)/);
});

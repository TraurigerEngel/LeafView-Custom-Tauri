import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = file => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("HF3: empty-screen Open button is above Leaflet and remains clickable", () => {
  const scss = read("src/App.scss");
  const app = read("src/App.tsx");
  const view = read("src/View.tsx");
  const capability = JSON.parse(read("src-tauri/capabilities/default.json"));
  assert.match(scss, /\.empty-state\s*\{[^}]*position:\s*absolute;[^}]*z-index:\s*[1-9]\d*;/s);
  assert.match(scss, /\.container\s+\.view\.init\s*\{[^}]*pointer-events:\s*none;/s);
  assert.match(app, /className="empty-open"\s+onClick=\{doOpen\}/);
  assert.match(view, /className=\{path \? "view" : "view init"\}/);
  assert.match(app, /const selected = await open\(/);
  assert.ok(capability.permissions.includes("dialog:allow-open"));
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = file => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("HF7: deletion confirmation uses silent in-app dialog instead of Windows warning", () => {
  const app = read("src/App.tsx");
  const css = read("src/App.scss");
  assert.doesNotMatch(app, /\bask\s*\(/);
  assert.doesNotMatch(app, /kind:\s*["']warning["']/);
  assert.match(app, /const yes = await confirmDelete\(fileName\(current\)\)/);
  assert.match(app, /role="alertdialog" aria-modal="true"/);
  assert.match(css, /\.delete-dialog-backdrop/);
  assert.match(css, /z-index:\s*100/);
});

test("HF7: cancellation preserves image and confirmation precedes recycling", () => {
  const app = read("src/App.tsx");
  const rust = read("src-tauri/src/lib.rs");
  assert.ok(app.indexOf("if (!yes) return;") > app.indexOf("await confirmDelete("));
  assert.ok(app.indexOf("await moveToTrash(current)") > app.indexOf("if (!yes) return;"));
  assert.match(app, /onClick=\{\(\) => answerDelete\(false\)\}/);
  assert.match(app, /onClick=\{\(\) => answerDelete\(true\)\}/);
  assert.match(app, /confirmDeleteButton\.current\?\.focus\(\)/);
  assert.match(rust, /trash::delete\(canonical\)/);
  assert.match(rust, /if canonical\.parent\(\) != Some\(parent\.as_path\(\)\)/);
});

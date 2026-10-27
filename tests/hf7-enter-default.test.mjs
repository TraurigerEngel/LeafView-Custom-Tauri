import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const app = () => readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

test("HF7 enter hotfix: Move to Trash receives focus when confirmation opens", () => {
  const src = app();
  assert.match(src, /const confirmDeleteButton = useRef<HTMLButtonElement>\(null\)/);
  assert.match(src, /if \(deleteConfirm !== null\) confirmDeleteButton\.current\?\.focus\(\)/);
  assert.match(src, /className="delete-dialog-confirm" ref=\{confirmDeleteButton\} onClick=\{\(\) => answerDelete\(true\)\}/);
  assert.doesNotMatch(src, /cancelDeleteButton\.current\?\.focus\(\)/);
});

test("HF7 enter hotfix: Enter retains native button activation, Tab can reach Cancel", () => {
  const src = app();
  assert.match(src, /if \(confirmResolver\.current\) \{\s*if \(!\["Tab", "Enter", " "\]\.includes\(e\.key\)\)/);
  assert.match(src, /ref=\{confirmDeleteButton\} onClick=\{\(\) => answerDelete\(true\)\}/);
  assert.match(src, /ref=\{cancelDeleteButton\} onClick=\{\(\) => answerDelete\(false\)\}>Отмена/);
  assert.match(src, /event\.key !== "Tab"/);
  assert.match(src, /document\.activeElement === confirmDeleteButton\.current/);
  assert.match(src, /\? cancelDeleteButton\.current/);
  assert.match(src, /if \(e\.key === "Escape"\)/);
  assert.match(src, /await moveToTrash\(current\)/);
});

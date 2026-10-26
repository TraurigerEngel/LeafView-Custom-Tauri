import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("Project version matches npm lockfile, Tauri config and Rust package", () => {
  const pkg = JSON.parse(read("package.json"));
  const lock = JSON.parse(read("package-lock.json"));
  const tauri = JSON.parse(read("src-tauri/tauri.conf.json"));
  const cargo = read("src-tauri/Cargo.toml");
  const cargoLock = read("src-tauri/Cargo.lock");

  assert.equal(lock.version, pkg.version, "npm lockfile version");
  assert.equal(lock.packages[""].version, pkg.version, "npm lockfile root package version");
  assert.equal(lock.name, pkg.name, "npm lockfile name");
  assert.equal(lock.packages[""].name, pkg.name, "npm lockfile root package name");
  assert.deepEqual(lock.packages[""].dependencies, pkg.dependencies, "runtime dependencies");
  assert.deepEqual(lock.packages[""].devDependencies, pkg.devDependencies, "dev dependencies");
  assert.equal(tauri.version, pkg.version, "Tauri app version");

  const cargoVersion = cargo.match(/^version\s*=\s*"([^"]+)"/m);
  assert.ok(cargoVersion, "Cargo.toml package version must exist");
  assert.equal(cargoVersion[1], pkg.version, "Cargo.toml version");

  const packageBlock = cargoLock.match(/\[\[package\]\]\r?\nname = "leafview-custom-tauri"\r?\nversion = "([^"]+)"/);
  assert.ok(packageBlock, "Cargo.lock app package version must exist");
  assert.equal(packageBlock[1], pkg.version, "Cargo.lock package version");
});

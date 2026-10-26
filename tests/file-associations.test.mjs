import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

const source = read('scripts/FILE-ASSOCIATIONS.ps1');
const tauri = JSON.parse(read('src-tauri/tauri.conf.json'));

test('HF4: registered extensions match Tauri file associations', () => {
  const match = source.match(/\$Extensions\s*=\s*@\(([^)]*)\)/);
  assert.ok(match);
  const actual = [...match[1].matchAll(/'\.(\w+)'/g)].map(m => m[1]).sort();
  const expected = [...tauri.bundle.fileAssociations[0].ext].sort();
  assert.deepEqual(actual, expected);
});

test('HF4: registration is per-user, reversible, and preserves Windows UserChoice', () => {
  assert.match(source, /Registry\]::CurrentUser/);
  assert.match(source, /Software\\RegisteredApplications/);
  assert.match(source, /Software\\Classes\\/);
  assert.match(source, /registeredAppUser=/);
  assert.match(source, /DeleteSubKeyTree/);
  assert.match(source, /Test-Owner/);
  assert.match(source, /"%1"/);
  assert.doesNotMatch(source, /\\UserChoice\b|SetUserFTA|Get-FileHash/);
  assert.match(source, /-PathType Leaf/);
});

test('HF4: launcher files use CRLF, no BOM, and run PowerShell 5.1', () => {
  for (const file of ['REGISTER-LEAFVIEW.cmd', 'UNREGISTER-LEAFVIEW.cmd']) {
    const bytes = readFileSync(new URL('../' + file, import.meta.url));
    assert.equal(bytes.subarray(0, 5).toString('ascii'), '@echo', file);
    assert.equal(bytes[0], 0x40, file);
    assert.ok(bytes.includes(Buffer.from('\r\n')), file);
    const cmd = bytes.toString('utf8');
    assert.match(cmd, /powershell\.exe -NoProfile -ExecutionPolicy Bypass/);
  }
});

test('HF5 packaging: registry helper accepts both portable and project EXE paths', () => {
  assert.match(source, /\$PortableExePath = Join-Path \$ProjectRoot 'LeafView Custom Tauri\.exe'/);
  assert.match(source, /\$BuildExePath = Join-Path \$ProjectRoot 'src-tauri\\target\\release\\LeafView Custom Tauri\.exe'/);
  assert.match(source, /Test-Path -LiteralPath \$PortableExePath -PathType Leaf/);
});

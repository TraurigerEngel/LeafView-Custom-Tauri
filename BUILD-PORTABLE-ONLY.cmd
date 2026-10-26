@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
where cargo >nul 2>&1 || (echo ERROR: Rust/Cargo not found & pause & exit /b 1)
where npm >nul 2>&1 || (echo ERROR: Node.js/npm not found & pause & exit /b 1)
if exist "node_modules\@tauri-apps\cli\package.json" (
  echo Reusing local node_modules. No dependency download needed.
) else (
  if exist package-lock.json (call npm ci) else (call npm install)
  if errorlevel 1 goto :fail
)
call npm test
if errorlevel 1 goto :fail
cargo test --manifest-path "src-tauri\Cargo.toml"
if errorlevel 1 goto :fail
call npm run tauri -- build --no-bundle
if errorlevel 1 goto :fail
echo Portable EXE: src-tauri\target\release\LeafView Custom Tauri.exe
pause
exit /b 0
:fail
pause
exit /b 1

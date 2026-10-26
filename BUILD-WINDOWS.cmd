@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
echo [1/5] Checking Windows toolchain...
where npm >nul 2>&1 || (echo ERROR: Node.js/npm not found. & pause & exit /b 1)
where cargo >nul 2>&1 || (echo ERROR: Rust/Cargo not found. Install Rust MSVC target. & pause & exit /b 1)
where rustc >nul 2>&1 || (echo ERROR: Rust compiler not found. & pause & exit /b 1)
echo [2/5] Installing project dependencies...
if exist "node_modules\@tauri-apps\cli\package.json" (
  echo Reusing local node_modules. No dependency download needed.
) else (
  if exist package-lock.json (call npm ci) else (call npm install)
  if errorlevel 1 goto :fail
)
echo [3/5] Running JavaScript and Rust tests...
call npm test
if errorlevel 1 goto :fail
cargo test --manifest-path "src-tauri\Cargo.toml"
if errorlevel 1 goto :fail
echo [4/5] Building portable executable...
call npm run tauri -- build --no-bundle
if errorlevel 1 goto :fail
echo [5/5] Building NSIS installer...
call npm run tauri -- build --bundles nsis
if errorlevel 1 goto :fail
echo.
echo SUCCESS. Portable EXE: src-tauri\target\release\LeafView Custom Tauri.exe
echo Installer folder: src-tauri\target\release\bundle\nsis\
pause
exit /b 0
:fail
echo FAILED. See the error above.
pause
exit /b 1

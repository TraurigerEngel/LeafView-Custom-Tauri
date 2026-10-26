@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\FILE-ASSOCIATIONS.ps1" -Action Register
if errorlevel 1 (
  echo.
  echo ERROR: LeafView registration failed. See the message above.
  pause
  exit /b 1
)
echo.
echo LeafView registered. Use Windows Default Apps to choose preferred formats.
pause
exit /b 0

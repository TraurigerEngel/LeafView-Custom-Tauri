@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\FILE-ASSOCIATIONS.ps1" -Action Unregister
if errorlevel 1 (
  echo.
  echo ERROR: Could not remove LeafView registration. See the message above.
  pause
  exit /b 1
)
echo.
echo LeafView registration removed for this Windows user.
pause
exit /b 0

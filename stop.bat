@echo off
cd /d "%~dp0"
chcp 65001 >nul
echo ANNAgram clone servers stopping...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\stop.ps1"
if errorlevel 1 (
  echo Failed to stop some processes.
  pause
  exit /b 1
)
echo Done.

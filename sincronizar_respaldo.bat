@echo off
title Seminuevos Autos - Sincronizacion Triple de Respaldo
cd /d "%~dp0"

echo ====================================================================
echo  SEMINUEVOS AUTOS - SINCRONIZACION TRIPLE DE RESPALDO AL 100%%
echo  Supabase (Nube) ^<--^> PC Local (SEMINUEVOS) ^<--^> GitHub (origin main)
echo ====================================================================

set "NODE_BIN=%APPDATA%\Antigravity\bin\agy-node.cmd"
if not exist "%NODE_BIN%" (
  set "NODE_BIN=node"
)

"%NODE_BIN%" "scripts\sync_triple_backup.cjs"

echo.
echo Proceso de respaldo y sincronizacion finalizado.
pause

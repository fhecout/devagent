@echo off
cd /d "%~dp0"

echo Iniciando DevAgent Lite...
echo   Backend:  http://localhost:3002
echo   Frontend: http://localhost:5173
echo.

start "DevAgent - Backend" cmd /k "cd /d %~dp0backend && npm run dev"
start "DevAgent - Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo Janelas abertas. Feche cada terminal para encerrar o servico.

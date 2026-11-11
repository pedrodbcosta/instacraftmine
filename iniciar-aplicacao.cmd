@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title Instacraftmine

echo.
echo   ============================================
echo    Instacraftmine - Gestor de Minecraft
echo   ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo   Node.js nao foi encontrado.
  echo   Instala a versao 20 ou superior em https://nodejs.org
  echo   e volta a abrir este ficheiro.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo   A instalar dependencias - so na primeira vez, pode demorar...
  call npm install --no-audit --no-fund
  if errorlevel 1 goto erro
)

if not exist "dist\index.html" (
  echo   A preparar a aplicacao...
  call npm run build
  if errorlevel 1 goto erro
)

echo.
echo   A abrir a aplicacao no teu navegador.
echo   Isto serve apenas os ficheiros do site (dist).
echo   As contas e o Instacraft usam a base de dados Supabase,
echo   por isso nao precisas de servidor nenhum neste PC.
echo.
echo   Se quiseres, tambem podes fechar esta janela e abrir
echo   dist\index.html com duplo clique - a aplicacao funciona
echo   sem servidor. Este atalho serve-a por HTTP, que e o que
echo   a instalacao como app (PWA) precisa.
echo.
echo   Mantem esta janela aberta enquanto a usares.
echo   Para parar: fecha esta janela ou prime Ctrl+C.
echo.

node scripts\serve.mjs 4173 --open
goto fim

:erro
echo.
echo   Algo falhou. Le as mensagens acima.
echo.
pause

:fim
endlocal

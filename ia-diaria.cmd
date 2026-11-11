@echo off
rem ---------------------------------------------------------------------------
rem  Instacraftmine - ronda diaria do Minecraft AI (modelo local + base de regras)
rem
rem  Duplo clique: corre agora e mostra o resultado (fica a espera de uma tecla
rem  no fim). Agendado: corre em silencio e escreve no registo indicado.
rem
rem  Tudo o que e sensivel vive em %USERPROFILE%\.instacraftmine\ia.env e o
rem  registo fica em %LOCALAPPDATA%\Instacraftmine\ - nada disto entra no projeto.
rem ---------------------------------------------------------------------------
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title Instacraftmine - IA diaria

set "LOG=%LOCALAPPDATA%\Instacraftmine\ia-diaria.log"
if not exist "%LOCALAPPDATA%\Instacraftmine" mkdir "%LOCALAPPDATA%\Instacraftmine"

set "PAUSA=1"
if /i "%~1"=="--tarefa" set "PAUSA=0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js nao foi encontrado. Instala a versao 20 ou superior em https://nodejs.org
  if "%PAUSA%"=="1" pause
  exit /b 1
)

echo. >> "%LOG%"
echo ---- %DATE% %TIME% ---- >> "%LOG%"
node "scripts\ia-diaria\run.mjs" --tarefa >> "%LOG%" 2>&1
set "CODIGO=%ERRORLEVEL%"

if "%CODIGO%"=="0" (
  echo   Ronda terminada. Registo: %LOG%
) else (
  echo   A ronda falhou. Le o registo: %LOG%
  echo.
  rem Mostra as ultimas linhas para se perceber o que se passou.
  rem -Encoding utf8: o registo e escrito em UTF-8 (chcp 65001); sem isto os
  rem acentos apareceriam trocados na janela.
  powershell -NoProfile -Command "Get-Content -LiteralPath '%LOG%' -Tail 12 -Encoding utf8" 2>nul
)

if "%PAUSA%"=="1" (
  echo.
  pause
)
endlocal & exit /b %CODIGO%

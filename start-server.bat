@echo on
REM Trace - Backend launcher v6 (sempre faz npm install, node:sqlite built-in)
title Trace Backend v6
setlocal enabledelayedexpansion

set "FRONT_DIR=%~dp0"
if "%FRONT_DIR:~-1%"=="\" set "FRONT_DIR=%FRONT_DIR:~0,-1%"
set "SERVER_DIR=C:\trace-server"
set "LOGFILE=C:\trace-server-log.txt"

echo === Trace start v6 === > "%LOGFILE%"
echo %date% %time% >> "%LOGFILE%"
echo FRONT_DIR=%FRONT_DIR% >> "%LOGFILE%"
echo SERVER_DIR=%SERVER_DIR% >> "%LOGFILE%"

echo.
echo =====================================================
echo   Trace - Backend (v6 - SQLite built-in)
echo =====================================================
echo   FRONT_DIR  = %FRONT_DIR%
echo   SERVER_DIR = %SERVER_DIR%
echo =====================================================
echo.
echo Pressione qualquer tecla para iniciar...
pause

echo.
echo [0] Verificando Node.js...
node --version
if not %errorlevel% == 0 (
  echo [ERRO] Node nao esta no PATH.
  goto :END
)

echo.
echo [1] Criando %SERVER_DIR%...
if not exist "%SERVER_DIR%" mkdir "%SERVER_DIR%"

echo.
echo [2] Copiando arquivos do server com robocopy...
robocopy "%FRONT_DIR%\server" "%SERVER_DIR%" /MIR /XD node_modules storage /R:1 /W:1 /NFL /NDL /NJH /NJS
set "RC=%errorlevel%"
echo robocopy errorlevel = %RC% >> "%LOGFILE%"
echo robocopy retornou: %RC%
if %RC% GEQ 8 (
  echo [ERRO] robocopy falhou.
  goto :END
)

cd /d "%SERVER_DIR%"
echo Pasta atual:
cd

echo.
echo [3] Limpando instalacao anterior ^(force clean^)...
if exist "node_modules" (
  echo Removendo node_modules...
  rmdir /s /q "node_modules" 2>nul
  REM segunda tentativa caso a primeira tenha falhado parcialmente
  if exist "node_modules" rmdir /s /q "node_modules" 2>nul
)
if exist "package-lock.json" del /q "package-lock.json" 2>nul

echo.
echo [4] Criando .env...
(
  echo PORT=3000
  echo DB_PATH=./storage/data.sqlite
  echo JWT_SECRET=trace-dev-secret
  echo JWT_EXPIRES_IN=86400
  echo CORS_ORIGIN=*
  echo UPLOAD_DIR=./storage/uploads
  echo UPLOAD_MAX_MB=20
  echo FRONTEND_DIR=%FRONT_DIR%
) > .env
echo .env criado:
type .env

echo.
echo [5] npm install ^(express + cors + bcrypt + jwt + multer + dotenv^)...
echo Sem builds nativos, deve levar 20-40 segundos...
call npm install --no-audit --no-fund
set "NPM_RC=!errorlevel!"
echo npm install errorlevel = !NPM_RC! >> "%LOGFILE%"
if not !NPM_RC! == 0 (
  echo.
  echo [ERRO] npm install falhou com codigo !NPM_RC!.
  echo Verifique sua conexao com a internet.
  goto :END
)
echo npm install OK.

echo.
echo [6] Migrate...
call npm run db:migrate
set "MIG_RC=!errorlevel!"
echo migrate errorlevel = !MIG_RC! >> "%LOGFILE%"
if not !MIG_RC! == 0 (
  echo [ERRO] migrate falhou.
  goto :END
)

echo.
echo [7] Seed ^(cria usuario Thiago^)...
call npm run db:seed

echo.
echo [8] Abrindo navegador em 5s...
start "" cmd /c "timeout /t 5 /nobreak >nul && start http://localhost:3000"

echo.
echo =====================================================
echo   Servidor: http://localhost:3000
echo   Login: thiago@tracengenharia.com.br
echo   Senha: 36714662
echo =====================================================
echo.
echo Iniciando servidor (Ctrl+C para parar)...
echo.

call npm start

echo.
echo [fim] npm start terminou com errorlevel %errorlevel%
echo Veja o log em %LOGFILE%

:END
echo.
echo =====================================================
echo Script terminado. Pressione qualquer tecla para fechar.
echo Log: %LOGFILE%
echo =====================================================
pause

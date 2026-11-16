@echo off
rem ==========================================================
rem  Savannah Pharmacy - double-click this file to start.
rem ==========================================================
title Savannah Pharmacy
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js is not installed on this computer.
  echo  The download page will open now. Install the LTS version,
  echo  then double-click "Start Savannah" again.
  echo.
  start "" https://nodejs.org
  pause
  exit /b 1
)

rem Already running? Just open it in the browser.
curl -s -o nul http://localhost:4000/api/health >nul 2>nul
if not errorlevel 1 (
  echo Savannah Pharmacy is already running. Opening it...
  start "" http://localhost:4000
  timeout /t 3 >nul
  exit /b 0
)

rem First time (or after an update): install and build. Takes a few minutes.
set NEEDS_SETUP=
if not exist "server\node_modules" set NEEDS_SETUP=1
if not exist "client\dist\index.html" set NEEDS_SETUP=1
if defined NEEDS_SETUP (
  echo.
  echo  Setting up Savannah Pharmacy for the first time.
  echo  This needs internet and takes a few minutes. Please wait...
  echo.
  call npm run build
  if errorlevel 1 (
    echo.
    echo  Setup failed. Check the internet connection and try again.
    pause
    exit /b 1
  )
)

rem Open the browser as soon as the app is ready.
start "" /b powershell -NoProfile -WindowStyle Hidden -Command "for($i=0;$i -lt 60;$i++){try{Invoke-WebRequest -UseBasicParsing http://localhost:4000/api/health -TimeoutSec 1 | Out-Null; Start-Process 'http://localhost:4000'; break}catch{Start-Sleep -Milliseconds 700}}"

cls
echo.
echo  ===========================================================
echo     SAVANNAH PHARMACY IS RUNNING
echo.
echo     Keep this window open while you use the app.
echo     To close the app, close this window.
echo  ===========================================================
echo.

cd server
node --disable-warning=ExperimentalWarning src\index.js
echo.
echo  The app has stopped.
pause

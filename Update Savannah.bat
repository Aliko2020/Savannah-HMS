@echo off
rem ==========================================================
rem  Savannah Pharmacy - get the latest version.
rem ==========================================================
title Update Savannah Pharmacy
cd /d "%~dp0"

curl -s -o nul http://localhost:4000/api/health >nul 2>nul
if not errorlevel 1 (
  echo.
  echo  Please close Savannah Pharmacy first ^(close its black window^),
  echo  then run this update again.
  echo.
  pause
  exit /b 1
)

echo.
echo  Downloading the latest version...
echo.
rem These files are re-created automatically; discard local copies so the update can't be blocked.
git checkout -- package-lock.json server/package-lock.json client/package-lock.json >nul 2>nul
git pull
if errorlevel 1 (
  echo.
  echo  The update could not be downloaded. Check the internet connection and try again.
  pause
  exit /b 1
)

echo.
echo  Installing the update. Please wait...
echo.
call npm run build
if errorlevel 1 (
  echo.
  echo  The update could not be installed. Check the internet connection and try again.
  pause
  exit /b 1
)

echo.
echo  ===========================================================
echo     Update complete. Start Savannah Pharmacy as usual.
echo  ===========================================================
echo.
pause

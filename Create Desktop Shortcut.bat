@echo off
rem ==========================================================
rem  Savannah Pharmacy - put a shortcut on the Desktop.
rem  Run this once.
rem ==========================================================
title Savannah Pharmacy shortcut
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "windows\make-shortcut.ps1"
pause

@echo off
cd /d "%~dp0"
title WorkGrid Pro Builder (Safe)
color 0A

echo [1/5] Cleaning processes...
taskkill /F /IM "workgrid-pro.exe" >nul 2>&1
taskkill /F /IM "electron.exe" >nul 2>&1
if exist release rd /s /q release
if exist dist rd /s /q dist

echo.
echo [2/5] Checking environment...
if exist node_modules goto skip_install
echo Installing dependencies...
call npm config set registry https://registry.npmmirror.com
call npm install
:skip_install

echo.
echo [3/5] Updating version...
if exist version_up.js call node version_up.js

echo.
echo [4/5] Building React App...
call npm run build
if errorlevel 1 goto build_error

echo.
echo [5/5] Packaging...
call npm run pack
if errorlevel 1 goto pack_error

echo.
echo ==========================================
echo  SUCCESS! App is ready.
echo ==========================================
pause
exit

:build_error
color 0C
echo ERROR: Build failed.
pause
exit

:pack_error
color 0C
echo ERROR: Pack failed.
pause
exit
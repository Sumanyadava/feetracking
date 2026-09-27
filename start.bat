@echo off
title Next.js Dev Server

echo.
echo ================================
echo   Starting Next.js Dev Server
echo ================================
echo.

cd /d "%~dp0"

echo Starting npm run dev...
start "Next.js Dev Server" cmd /k "npm run dev"

echo Waiting for server to start...
timeout /t 3 /nobreak >nul

echo Opening browser...
start "" "http://localhost:5173"

exit
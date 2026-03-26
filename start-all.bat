@echo off
chcp 65001 >nul
title 5G Remote Driving Platform

cls
echo ========================================
echo   5G Remote Driving Platform
echo ========================================
echo.

REM Start Video Proxy
echo [1/3] Starting Video Proxy...
start "VideoProxy" cmd /k "node video-proxy-ultra.cjs"
timeout /t 2 /nobreak >nul

REM Start G29 Server
echo [2/3] Starting G29 Server...
start "G29Server" cmd /k "node g29-server.cjs"
timeout /t 2 /nobreak >nul

REM Start Web Platform
echo [3/3] Starting Web Platform...
start "WebPlatform" cmd /k "npm run dev"

echo.
echo ========================================
echo   All Services Started!
echo ========================================
echo.
echo Video Proxy:  http://localhost:8001/
echo Web Platform: http://localhost:5173
echo G29 Server:   ws://localhost:8080
echo.
echo Press any key to close this window...
pause >nul

@echo off
chcp 65001 >nul
title Video Proxy Server

cls
echo ========================================
echo   Video Proxy Server (Ultra Low Latency)
echo ========================================
echo.

REM Set Car IP (modify if needed)
set CAR_IP=192.168.0.5

echo Configuration:
echo   Car IP:   %CAR_IP%
echo   Port:     8001
echo.
echo Starting...
echo.

REM Start Proxy Server
node video-proxy-ultra.cjs

echo.
echo Proxy server stopped.
pause

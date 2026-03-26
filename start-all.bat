@echo off
chcp 65001 >nul
title 5G 远程驾驶平台 - 启动脚本

cls
echo ========================================
echo   5G 远程驾驶平台 - 启动脚本
echo ========================================
echo.

REM 启动视频流代理（超低延迟版）
echo [1/3] 启动视频流代理（超低延迟）...
start "Video Proxy" cmd /k "title 视频流代理 & node video-proxy-ultra.cjs"
timeout /t 2 /nobreak >nul

REM 启动 G29 服务
echo [2/3] 启动 G29 方向盘服务...
start "G29 Server" cmd /k "title G29 方向盘服务 & node g29-server.cjs"
timeout /t 2 /nobreak >nul

REM 启动 Web 平台
echo [3/3] 启动 Web 平台...
start "Web Platform" cmd /k "title Web 平台 & npm run dev"

echo.
echo ========================================
echo   所有服务已启动！
echo ========================================
echo.
echo 视频流代理：http://localhost:8001/
echo Web 平台：http://localhost:5173
echo G29 服务：ws://localhost:8080
echo.
echo 按任意键关闭此窗口...
pause >nul

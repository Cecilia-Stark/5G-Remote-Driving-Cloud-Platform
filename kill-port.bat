@echo off
chcp 65001 >nul
title 端口清理工具

cls
echo ========================================
echo   端口清理工具
echo ========================================
echo.

echo 正在检查端口占用...
echo.

REM 杀死占用 8080 端口的进程
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8080') do (
    echo [8080] 正在清理进程：%%a
    taskkill /F /PID %%a 2>nul
)

REM 杀死占用 8001 端口的进程
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8001') do (
    echo [8001] 正在清理进程：%%a
    taskkill /F /PID %%a 2>nul
)

echo.
echo ========================================
echo   清理完成！
echo ========================================
echo.
pause

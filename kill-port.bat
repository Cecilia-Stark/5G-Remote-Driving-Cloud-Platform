@echo off
chcp 65001 >nul
title Port Cleaner

cls
echo ========================================
echo   Port Cleaner (8080 ^& 8001)
echo ========================================
echo.

echo Checking port usage...
echo.

REM Kill process on port 8080
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8080') do (
    echo [8080] Killing process: %%a
    taskkill /F /PID %%a 2>nul
)

REM Kill process on port 8001
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8001') do (
    echo [8001] Killing process: %%a
    taskkill /F /PID %%a 2>nul
)

echo.
echo ========================================
echo   Cleanup Complete!
echo ========================================
echo.
pause

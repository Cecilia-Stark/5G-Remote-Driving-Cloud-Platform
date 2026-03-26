@echo off
echo 杀死占用端口的进程...
echo.

REM 杀死占用 8080 端口的进程
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8080') do (
    echo 正在杀死占用 8080 端口的进程：%%a
    taskkill /F /PID %%a 2>nul
)

REM 杀死占用 8001 端口的进程
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8001') do (
    echo 正在杀死占用 8001 端口的进程：%%a
    taskkill /F /PID %%a 2>nul
)

echo.
echo 完成！按任意键继续...
pause >nul

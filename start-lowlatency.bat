@echo off
echo ========================================
echo   超低延迟视频流代理服务器
echo ========================================
echo.

REM 设置小车 IP（请根据实际情况修改）
set CAR_IP=192.168.0.5

echo 配置信息:
echo   小车 IP: %CAR_IP%
echo   本地端口：8001
echo.
echo 正在启动...
echo.

REM 启动代理服务器
node video-proxy-ultra.cjs

echo.
echo 代理服务器已关闭
pause

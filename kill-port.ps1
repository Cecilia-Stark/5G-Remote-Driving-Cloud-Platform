# 清理占用端口的进程
Write-Host "正在清理占用 8080 和 8001 端口的进程..." -ForegroundColor Yellow

# 获取占用端口的进程 ID
$port8080 = (Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue).OwningProcess
$port8001 = (Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue).OwningProcess

if ($port8080) {
    Write-Host "杀死占用 8080 端口的进程 (PID: $port8080)..." -ForegroundColor Yellow
    Stop-Process -Id $port8080 -Force -ErrorAction SilentlyContinue
}

if ($port8001) {
    Write-Host "杀死占用 8001 端口的进程 (PID: $port8001)..." -ForegroundColor Yellow
    Stop-Process -Id $port8001 -Force -ErrorAction SilentlyContinue
}

Write-Host "清理完成！" -ForegroundColor Green
Start-Sleep -Seconds 1

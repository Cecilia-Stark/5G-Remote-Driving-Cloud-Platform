#!/usr/bin/env node
/**
 * 简单视频流代理服务器
 * 功能：将小车 192.168.0.5:8000 的视频流转发到本地 8001 端口
 */

const http = require('http');

const TARGET_HOST = '192.168.0.5';
const TARGET_PORT = 8080;
const TARGET_PATH = '/stream?topic=/image_raw';
const LOCAL_PORT = 8001;

console.log('=' .repeat(60));
console.log('📺 视频流代理服务器');
console.log('=' .repeat(60));
console.log(`目标地址：http://${TARGET_HOST}:${TARGET_PORT}`);
console.log(`本地端口：http://localhost:${LOCAL_PORT}`);
console.log('=' .repeat(60));

const server = http.createServer((req, res) => {
  const options = {
    hostname: TARGET_HOST,
    port: TARGET_PORT,
    path: TARGET_PATH + '&t=' + Date.now(),
    method: req.method,
    headers: req.headers
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error(`[${new Date().toLocaleTimeString()}] ❌ 代理错误：${err.message}`);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: '无法连接到小车视频流', message: err.message }));
  });

  req.pipe(proxyReq, { end: true });
  
  console.log(`[${new Date().toLocaleTimeString()}] 📡 转发：${req.method} ${req.url}`);
});

server.listen(LOCAL_PORT, '0.0.0.0', () => {
  console.log('');
  console.log('✅ 代理服务器已启动');
  console.log('');
  console.log('视频流地址：');
  console.log(`  本地访问：http://localhost:${LOCAL_PORT}/`);
  console.log(`  远程访问：http://你的电脑IP:${LOCAL_PORT}/`);
  console.log('');
  console.log('在 Web 平台配置小车 IP 为：localhost');
  console.log('或修改 carControl.ts 中的 VIDEO_URL 为：http://localhost:' + LOCAL_PORT + '/')
  console.log('');
  console.log('=' .repeat(60));
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ 端口 ${LOCAL_PORT} 已被占用`);
  } else {
    console.error('❌ 服务器错误:', err.message);
  }
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n正在关闭...');
  server.close(() => {
    console.log('已关闭');
    process.exit(0);
  });
});

#!/usr/bin/env node
const http = require('http');
const net = require('net');

const TARGET_HOST = process.env.CAR_IP || '192.168.0.5';
const TARGET_PORT = 8080;  // 直接连接 web_video_server
const TARGET_PATH = '/stream?topic=/image_raw';  // 直接获取 image_raw 话题
const LOCAL_PORT = 8001;

console.log('═'.repeat(60));
console.log('🚀 超低延迟视频代理 (TCP 直连)');
console.log('═'.repeat(60));
console.log(`目标：http://${TARGET_HOST}:${TARGET_PORT}/mjpeg`);
console.log(`本地：http://localhost:${LOCAL_PORT}`);
console.log('═'.repeat(60));

let clientCount = 0;

http.createServer((req, res) => {
  const clientId = ++clientCount;
  console.log(`[${new Date().toLocaleTimeString()}] 📺 客户端 #${clientId} 连接`);
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Connection', 'close');
  
  const options = {
    hostname: TARGET_HOST,
    port: TARGET_PORT,
    path: TARGET_PATH,
    method: 'GET',
    headers: {
      'Connection': 'close',
      'Cache-Control': 'no-cache'
    },
    agent: false,
    timeout: 10000
  };
  
  const proxy = http.request(options, (proxyRes) => {
    console.log(`[${new Date().toLocaleTimeString()}] ✅ 客户端 #${clientId} 视频流已连接`);
    
    res.writeHead(200, {
      'Content-Type': 'multipart/x-mixed-replace; boundary=--boundary',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Connection': 'close',
      'Transfer-Encoding': 'chunked'
    });
    
    res.flushHeaders();
    
    proxyRes.on('data', (chunk) => {
      // 立即写入，不缓冲
      if (res.writable) {
        res.write(chunk);
      }
    });
    
    proxyRes.on('end', () => {
      console.log(`[${new Date().toLocaleTimeString()}] ⚠️ 客户端 #${clientId} 视频流结束`);
      res.end();
    });
  });
  
  proxy.on('error', (e) => {
    console.error(`[${new Date().toLocaleTimeString()}] ❌ 客户端 #${clientId}: ${e.message}`);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
    }
    res.end('Error: ' + e.message);
  });
  
  proxy.setTimeout(10000, () => {
    console.log(`[${new Date().toLocaleTimeString()}] ⏰ 客户端 #${clientId} 超时`);
    proxy.destroy();
    if (!res.headersSent) {
      res.writeHead(504);
    }
    res.end();
  });
  
  req.on('close', () => {
    console.log(`[${new Date().toLocaleTimeString()}] 🔌 客户端 #${clientId} 断开`);
    proxy.destroy();
  });
  
  req.on('error', (e) => {
    console.error(`[${new Date().toLocaleTimeString()}] ❌ 客户端 #${clientId} 请求错误：${e.message}`);
    proxy.destroy();
  });
  
  proxy.end();
}).listen(LOCAL_PORT, '0.0.0.0', () => {
  console.log('');
  console.log('✅ 代理服务器已启动');
  console.log(`  测试地址：http://localhost:${LOCAL_PORT}/`);
  console.log('');
  console.log('💡 优化：');
  console.log('  • 禁用所有缓冲');
  console.log('  • 立即刷新头部');
  console.log('  • 短连接模式');
  console.log('  • 10 秒超时');
  console.log('');
  console.log('═'.repeat(60));
});

process.on('SIGINT', () => {
  console.log('\n正在关闭...');
  process.exit(0);
});

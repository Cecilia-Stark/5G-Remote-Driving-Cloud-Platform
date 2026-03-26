#!/usr/bin/env node
/**
 * 低延迟视频流代理服务器
 * 优化：禁用缓冲、Keep-Alive、 Chunked 传输
 */

const http = require('http');

const TARGET_HOST = process.env.CAR_IP || '192.168.0.5';
const TARGET_PORT = 8000;
const LOCAL_PORT = 8001;

console.log('='.repeat(60));
console.log('📺 低延迟视频流代理');
console.log('='.repeat(60));
console.log(`目标：http://${TARGET_HOST}:${TARGET_PORT}/mjpeg`);
console.log(`本地：http://localhost:${LOCAL_PORT}`);
console.log('='.repeat(60));
console.log('');

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Connection', 'keep-alive');
  
  const options = {
    hostname: TARGET_HOST,
    port: TARGET_PORT,
    path: '/mjpeg',
    method: 'GET',
    headers: {
      'Connection': 'keep-alive',
      'Cache-Control': 'no-cache'
    },
    agent: false  // 禁用 HTTP 代理，减少延迟
  };
  
  console.log(`[${new Date().toLocaleTimeString()}] 📡 请求视频流...`);
  
  const proxy = http.request(options, (proxyRes) => {
    console.log(`[${new Date().toLocaleTimeString()}] ✅ 视频流连接成功`);
    
    res.writeHead(200, {
      'Content-Type': proxyRes.headers['content-type'] || 'multipart/x-mixed-replace',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    // 关键优化：禁用缓冲，立即转发每个 chunk
    proxyRes.on('data', (chunk) => {
      res.write(chunk);  // 立即写入，不缓冲
    });
    
    proxyRes.on('end', () => {
      console.log(`[${new Date().toLocaleTimeString()}] ⚠️ 视频流结束`);
      res.end();
    });
  });
  
  proxy.on('error', (e) => {
    console.error(`[${new Date().toLocaleTimeString()}] ❌ 错误：${e.message}`);
    res.writeHead(502);
    res.end('Error: ' + e.message);
  });
  
  // 设置超时
  proxy.setTimeout(30000);
  proxy.on('timeout', () => {
    console.log(`[${new Date().toLocaleTimeString()}] ⏰ 请求超时`);
    proxy.destroy();
  });
  
  proxy.end();
}).listen(LOCAL_PORT, '0.0.0.0', () => {
  console.log('');
  console.log('✅ 代理服务器已启动');
  console.log('');
  console.log(`  本地访问：http://localhost:${LOCAL_PORT}/`);
  console.log(`  远程访问：http://你的电脑 IP:${LOCAL_PORT}/`);
  console.log('');
  console.log('💡 提示：在 Web 平台配置小车 IP 为 localhost');
  console.log('');
  console.log('='.repeat(60));
});

const http = require('http');

const TARGET_HOST = '192.168.0.5';
const TARGET_PORT = 8000;
const LOCAL_PORT = 8001;

console.log('=' .repeat(60));
console.log('📺 视频流代理服务器');
console.log('=' .repeat(60));
console.log(`目标：http://${TARGET_HOST}:${TARGET_PORT}/mjpeg`);
console.log(`本地：http://localhost:${LOCAL_PORT}`);
console.log('=' .repeat(60) + '\n');

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const options = {
    hostname: TARGET_HOST,
    port: TARGET_PORT,
    path: '/mjpeg?t=' + Date.now(),
    method: 'GET',
    headers: { 'Connection': 'keep-alive' }
  };

  console.log(`[${new Date().toLocaleTimeString()}] 请求视频流...`);

  const proxy = http.request(options, (proxyRes) => {
    console.log(`[${new Date().toLocaleTimeString()}] ✅ 视频流连接成功`);
    res.writeHead(200, {
      'Content-Type': proxyRes.headers['content-type'] || 'multipart/x-mixed-replace',
      'Cache-Control': 'no-cache'
    });
    proxyRes.pipe(res);
  });

  proxy.on('error', (err) => {
    console.error(`[${new Date().toLocaleTimeString()}] ❌ ${err.message}`);
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('视频流连接失败：' + err.message);
  });

  proxy.end();
}).listen(LOCAL_PORT, () => {
  console.log('✅ 代理服务器已启动');
  console.log('测试地址：http://localhost:' + LOCAL_PORT + '/');
  console.log('=' .repeat(60));
});

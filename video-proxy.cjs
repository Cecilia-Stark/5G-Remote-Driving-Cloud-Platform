const http = require('http');

console.log('🚀 启动视频代理...\n');
console.log('目标：http://192.168.0.5:8000/mjpeg');
console.log('本地：http://localhost:8001\n');

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const reqOptions = {
    hostname: '192.168.0.5',
    port: 8000,
    path: '/mjpeg',
    method: 'GET'
  };
  
  console.log('[' + new Date().toLocaleTimeString() + '] 请求视频流...');
  
  const proxy = http.request(reqOptions, (proxyRes) => {
    console.log('[' + new Date().toLocaleTimeString() + '] ✅ 连接成功');
    res.writeHead(200, {
      'Content-Type': 'multipart/x-mixed-replace',
      'Cache-Control': 'no-cache'
    });
    proxyRes.pipe(res);
  });
  
  proxy.on('error', (e) => {
    console.log('[' + new Date().toLocaleTimeString() + '] ❌ 错误：' + e.message);
    res.writeHead(502);
    res.end('Error: ' + e.message);
  });
  
  proxy.end();
}).listen(8001, () => {
  console.log('✅ 代理服务器运行在 http://localhost:8001\n');
});

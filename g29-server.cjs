const HID = require('node-hid');
const WebSocket = require('ws');

// 1. 创建 WebSocket 服务器 (与我们在 ControlView.tsx 中的端口 8080 对应)
const wss = new WebSocket.Server({ port: 8080 });

console.log("WebSocket 服务器已启动，监听端口: 8080 (等待前端网页连接...)");

// 2. 连接 G29 方向盘
const vendorId = 1133;
const productId = 49743;
let device = null;

function connectG29() {
    try {
        device = new HID.HID(vendorId, productId);
        console.log("G29 硬件已成功连接！");

        // 3. 读取数据并广播
        device.on("data", (data) => {
            const buffer = Buffer.from(data);

            // ===== 方向盘 =====
            const steeringRaw = buffer.readUInt16LE(4);
            const steeringSigned = steeringRaw - 32768;
            const steeringDegree = steeringSigned / 32768 * 450;

            // ===== 油门 =====
            const throttleRaw = buffer[6];
            const throttlePercent = (255 - throttleRaw) / 255 * 100;

            // ===== 刹车 =====
            const brakeRaw = buffer[7];
            const brakePercent = (255 - brakeRaw) / 255 * 100;

            // 组装要发送给前端的数据
            const payload = JSON.stringify({
                status: 'connected',
                steering: parseFloat(steeringDegree.toFixed(1)),
                throttle: parseFloat(throttlePercent.toFixed(1)),
                brake: parseFloat(brakePercent.toFixed(1))
            });

            broadcast(payload);
        });

        device.on("error", (err) => {
            console.error("G29 读取错误:", err);
            device = null;
            broadcast(JSON.stringify({ status: 'error', message: '硬件读取错误' }));
            setTimeout(connectG29, 3000); // 尝试重连
        });

    } catch (e) {
        console.error("无法连接到 G29 方向盘，请检查 USB 连接或驱动。");
        broadcast(JSON.stringify({ status: 'disconnected', message: '未检测到 G29 方向盘' }));
        setTimeout(connectG29, 3000); // 尝试重连
    }
}

// 记录所有连接的前端客户端
const clients = new Set();

function broadcast(payload) {
    for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    }
}

wss.on('connection', (ws) => {
    console.log("✅ 前端驾驶舱控制台已连接！");
    clients.add(ws);

    // 刚连接时发送当前状态
    if (device) {
        ws.send(JSON.stringify({ status: 'connected', steering: 0, throttle: 0, brake: 0 }));
    } else {
        ws.send(JSON.stringify({ status: 'disconnected', message: '未检测到 G29 方向盘' }));
    }

    ws.on('close', () => {
        console.log("❌ 前端驾驶舱已断开连接。");
        clients.delete(ws);
    });
});

// 初始连接
connectG29();

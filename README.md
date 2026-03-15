# 5G 远程驾驶云控平台 (5G Remote Driving Cloud Platform)

## 📖 1. 项目目录与文件说明 (Project Structure)

了解每个文件是做什么的，有助于您快速定位修改位置。

```text
/
├── index.html                   # 入口 HTML，引入了百度地图 GL JS SDK
├── index.tsx                    # React 入口文件
├── App.tsx                      # 主应用逻辑，处理登录、页面路由切换 (Login/Monitor/Control)
├── types.ts                     # 数据字典 (定义了车辆数据的格式、状态枚举、日志格式)
├── metadata.json                # 权限配置文件 (摄像头、麦克风、地理位置)
│
├── services/                    # [核心] 后端通讯层
│   └── vehicleConnection.ts     # ★★★ 最重要的文件。负责 WebSocket 遥测数据接收 + WebRTC 视频流连接逻辑。
│
├── views/                       # 页面视图层
│   ├── LoginView.tsx            # 登录界面
│   ├── MonitorView.tsx          # 实时监控界面 (显示视频、地图、大屏数据)
│   ├── ControlView.tsx          # 远程控制界面 (接管时的驾驶舱视图，带仪表盘)
│   └── HistoryView.tsx          # 历史回放界面 (接管日志记录)
│
└── components/                  # 通用组件层
    ├── VideoFeed.tsx            # 视频播放器 (支持模拟视频源和真实 WebRTC 流的切换)
    └── MapContainer.tsx         # 地图组件 (封装了百度地图 GL，支持 3D 视角和车辆跟随)
```

---

## 2. 真实环境接入指南 (Integration Guide)

**这是让代码从“演示版”变成“实战版”的关键步骤。** 您需要修改代码中的几个“填空区”。

### 第一步：接入真实视频流 (Video Streaming)

前端不负责“上传”视频，前端只负责“拉取”视频。
*   **车端 (上传)**: 需在车上运行 FFmpeg 命令（见第 4 节），推流到服务器。
*   **云端 (转发)**: 需运行 SRS 服务器（见第 3 节）。
*   **前端 (拉取)**: 修改 `services/vehicleConnection.ts`。

**需修改文件**: `services/vehicleConnection.ts`

```typescript
// 找到 startWebRTCStream() 方法内的 [填空区 B]
// 将 localhost 修改为您云服务器的公网 IP
const SRS_SERVER_IP = "127.0.0.1"; // -> 改为例如 "101.35.x.x"
```

### 第二步：接入真实车辆数据 (Telemetry Data)

包括车速、转速、方向盘转角、GPS 坐标等。

**需修改文件**: `services/vehicleConnection.ts`

```typescript
// 找到 connect() 方法内的 [填空区 A]
// 1. 注释掉当前的模拟定时器 (setInterval ...)
// 2. 解开 WebSocket 代码的注释，并填入您的后端地址

// const socket = new WebSocket('wss://your-real-backend.com/api/telemetry');
// socket.onmessage = (e) => { ... }
```

### 第三步：接入真实控制指令 (Control Commands)

当您点击“主动接管”或转动方向盘时，前端需要发指令给车。

**需修改文件**: `services/vehicleConnection.ts`

```typescript
// 找到 sendControlCommand() 方法内的 [填空区 C]
// 解开注释，将指令发送给 WebSocket
// socket.send(JSON.stringify({ cmd: command, val: value }));
```

### 第四步：百度地图 API Key

目前使用的是演示用的 AK，如果用于生产环境，可能会被限制。

**需修改文件**: `index.html`

```html
<!-- 替换您的百度地图 AK (Access Key) -->
<script src="//api.map.baidu.com/api?type=webgl&...&ak=您的密钥"></script>
```

---

## 3. 环境搭建与运行 (Setup & Run)

### 前置条件
1.  **Node.js**: 用于运行前端代码 (v16+)。
2.  **Docker**: 用于一键启动流媒体服务器。

### 启动流媒体服务器 (Cloud Side)
在本地或云服务器上安装 Docker，并运行以下命令启动 SRS 服务器：

```bash
docker run --rm -p 1935:1935 -p 1985:1985 -p 8080:8080 ossrs/srs:4
```
*   `1935`: 车端推流端口 (RTMP)
*   `1985`: 前端播放端口 (WebRTC API)

### 启动前端项目 (Client Side)

```bash
# 1. 安装依赖包
npm install

# 2. 启动网页
npm run dev
```

---

## 4. 车端视频推流 (Car Side)

您需要在车端工控机（如 NVIDIA Jetson 或树莓派）上运行以下命令，将摄像头画面传给云端。

**安装 FFmpeg**:
*   Ubuntu/Debian: `sudo apt install ffmpeg`
*   Windows: 下载 exe 并配置环境变量。

**推流命令 (USB 摄像头)**:
将 `<云端IP>` 替换为您运行 Docker SRS 的电脑 IP。

```bash
# Linux / Jetson
ffmpeg -f v4l2 -i /dev/video0 \
  -c:v libx264 -preset ultrafast -tune zerolatency \
  -f flv rtmp://<云端IP>/live/car_front

# Windows
ffmpeg -f dshow -i video="您的摄像头名称" \
  -c:v libx264 -preset ultrafast -tune zerolatency \
  -f flv rtmp://<云端IP>/live/car_front
```

---

## 5. 常见问题 (FAQ)

**Q1: 为什么监控画面一直是黑的？**
*   检查 Docker SRS 是否正在运行。
*   检查车端 FFmpeg 推流命令是否报错。
*   检查 `services/vehicleConnection.ts` 里的 IP 地址是否正确。
*   如果是远程部署，检查云服务器防火墙是否开放了 `1935` 和 `1985` 端口 (UDP+TCP)。

**Q2: 如何让地图显示真实位置？**
*   您需要有一个后端服务，接收车辆 GPS 模块的数据，然后通过 WebSocket 转发给前端。
*   前端在 `vehicleConnection.ts` 收到数据后，更新 `latitude` 和 `longitude` 字段即可。
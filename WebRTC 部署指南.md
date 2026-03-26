# 🚀 WebRTC 低延迟视频流部署指南

## 📊 延迟对比

| 方案 | 延迟 | 优点 | 缺点 |
|------|------|------|------|
| HTTP MJPEG 代理 | 2000-5000ms | 简单 | 延迟高，带宽大 |
| **WebRTC** | **200-500ms** | 延迟极低，带宽优化 | 需要部署服务器 |

---

## 🔧 方案架构

```
小车端 (Car Side):
  USB 摄像头 
    → ROS2 usb_cam (/image_raw)
    → FFmpeg 推流 (RTMP/H264)
    → 云端 SRS 服务器

云端 (Cloud Server):
  SRS (Simple Realtime Server)
    → 接收 RTMP 流
    → 转为 WebRTC
    → 分发给前端

前端 (Browser):
  WebRTC 播放器
    → 显示视频 (延迟<500ms)
```

---

## 📦 第一步：部署 SRS 流媒体服务器

### 方法 A：Docker 部署 (推荐)

```bash
# 1. 拉取 SRS 镜像
docker pull registry.cn-hangzhou.aliyuncs.com/ossrs/srs:5

# 2. 启动 SRS 容器
docker run --rm --name srs -p 1935:1935 -p 8080:8080 -p 1985:1985 -p 8000:8000/udp \
  registry.cn-hangzhou.aliyuncs.com/ossrs/srs:5 \
  ./objs/srs -c conf/rtc.conf
```

### 方法 B：本地测试 (开发环境)

```bash
# 如果你想在本地测试，使用 localhost
docker run --rm --name srs -p 127.0.0.1:1935:1935 -p 127.0.0.1:8080:8080 -p 127.0.0.1:1985:1985 \
  registry.cn-hangzhou.aliyuncs.com/ossrs/srs:5 \
  ./objs/srs -c conf/rtc.conf
```

### 验证 SRS 是否启动成功

访问：`http://localhost:1985/api/v1/versions`

看到 JSON 响应说明成功！

---

## 🚗 第二步：小车端推流配置

### 安装 FFmpeg (小车端)

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install -y ffmpeg

# 或者使用 ROS2 包
sudo apt install ros-humble-ffmpeg
```

### 方案 A：使用 FFmpeg 推流 (推荐)

在小车端创建推流脚本 `start_stream.sh`：

```bash
#!/bin/bash
# 小车推流脚本

# SRS 服务器地址 (云端 IP 或 本地 IP)
SRS_SERVER="你的云端服务器 IP"

# 获取摄像头设备 (通常是 /dev/video0)
CAMERA_DEVICE="/dev/video0"

# 推流参数
VIDEO_WIDTH=1280
VIDEO_HEIGHT=720
FRAMERATE=30
BITRATE=2000k

echo "🎥 开始推流到 rtmp://${SRS_SERVER}/live/car_front"

ffmpeg -f v4l2 -i ${CAMERA_DEVICE} \
  -video_size ${VIDEO_WIDTH}x${VIDEO_HEIGHT} \
  -framerate ${FRAMERATE} \
  -c:v libx264 -preset ultrafast -tune zerolatency \
  -b:v ${BITRATE} -g 60 \
  -c:a aac -b:a 64k \
  -f flv "rtmp://${SRS_SERVER}/live/car_front"
```

### 方案 B：从 ROS2 话题推流

如果你想从 ROS2 话题 `/image_raw` 推流：

```bash
#!/bin/bash
# 从 ROS2 话题推流

SRS_SERVER="你的云端服务器 IP"

# 使用 ros2_image 管道到 ffmpeg
ros2 run image_tools showimage --topic /image_raw \
  | ffmpeg -f image2pipe -i - \
    -c:v libx264 -preset ultrafast -tune zerolatency \
    -b:v 2000k -g 60 \
    -f flv "rtmp://${SRS_SERVER}/live/car_front"
```

### 方案 C：使用 GStreamer (最低延迟)

```bash
#!/bin/bash

SRS_SERVER="你的云端服务器 IP"

gst-launch-1.0 v4l2src device=/dev/video0 ! \
  video/x-raw,width=1280,height=720,framerate=30/1 ! \
  videoconvert ! \
  x264enc tune=zerolatency bitrate=2000 speed-preset=ultrafast ! \
  video/x-h264,stream-format=byte-stream,alignment=au ! \
  rtph264pay ! \
  gdppay ! \
  tcpserversink host=${SRS_SERVER} port=8554
```

---

## 🌐 第三步：前端 WebRTC 播放器集成

### 修改 `src/services/vehicleConnection.ts`

已经在代码中集成了 WebRTC 拉流逻辑，你只需要：

1. **配置 SRS 服务器地址**

编辑 `src/services/vehicleConnection.ts` 第 118 行：

```typescript
const SRS_SERVER_IP = "你的云端服务器 IP"; // 改成实际 IP
```

2. **确保流名称匹配**

推流时使用 `car_front` 作为流名称：
```bash
rtmp://SRS_IP/live/car_front
```

---

## 🧪 第四步：测试验证

### 1. 测试 SRS 服务

```bash
# 检查 SRS API
curl http://localhost:1985/api/v1/versions
```

### 2. 使用 SRS 播放器测试

访问 SRS 自带的播放器：
```
http://localhost:8080/players/rtc_player.html
```

配置：
- API: `http://localhost:1985/rtc/v1/play/`
- Stream: `webrtc://localhost/live/car_front`

### 3. 在 Web 平台测试

启动 Web 平台：
```bash
npm run dev
```

访问驾驶舱页面，视频应该显示且延迟极低！

---

## ⚙️ SRS 配置优化 (可选)

创建自定义配置文件 `srs.conf`：

```nginx
# SRS 配置文件 - 优化低延迟
listen              1935;
max_connections     1000;
daemon              off;
srs_log_level       info;

rtc {
    enabled         on;
    listen          8000;           # WebRTC UDP 端口
    candidate       $CANDIDATE;     # 候选地址
    protocol        udp;            # 强制 UDP
    use_auto_detect_network_ip off;
}

vhost __defaultVhost__ {
    # 低延迟优化
    gop_cache       off;            # 关闭 GOP 缓存
    queue_length    30;             # 队列长度
    
    rtc {
        enabled     on;
        nack        on;             # 启用 NACK 重传
        twcc        on;             # 传输层拥塞控制
    }
    
    # 转 WebRTC
    rtc {
        enabled on;
    }
}
```

运行：
```bash
docker run --rm --name srs -p 1935:1935 -p 8080:8080 -p 8000:8000/udp \
  -v $(pwd)/srs.conf:/usr/local/srs/conf/rtc.conf \
  registry.cn-hangzhou.aliyuncs.com/ossrs/srs:5 \
  ./objs/srs -c conf/rtc.conf
```

---

## 🚀 云端部署方案

### 1. 云服务器要求

- **CPU**: 2 核以上
- **内存**: 2GB 以上
- **带宽**: 上行 5Mbps 以上
- **端口**: 开放 1935 (RTMP), 8080 (HTTP), 8000 (WebRTC UDP)

### 2. 安全组配置

| 端口 | 协议 | 用途 |
|------|------|------|
| 1935 | TCP | RTMP 推流 |
| 8080 | TCP | HTTP API |
| 1985 | TCP | SRS API |
| 8000 | UDP | WebRTC 媒体流 |

### 3. 一键部署脚本

在云服务器上运行：

```bash
#!/bin/bash
# deploy_srs.sh

# 安装 Docker
curl -fsSL https://get.docker.com | sh

# 启动 SRS
docker run -d --restart=always --name srs \
  -p 1935:1935 -p 8080:8080 -p 1985:1985 -p 8000:8000/udp \
  registry.cn-hangzhou.aliyuncs.com/ossrs/srs:5 \
  ./objs/srs -c conf/rtc.conf

echo "✅ SRS 部署完成！"
echo "服务器 IP: $(curl ifconfig.me)"
```

---

## 📈 性能调优

### 1. 降低分辨率
```bash
# 720p @ 30fps (推荐平衡点)
-video_size 1280x720 -framerate 30

# 480p @ 60fps (更低延迟)
-video_size 854x480 -framerate 60
```

### 2. 降低码率
```bash
# 1000kbps (低带宽)
-b:v 1000k

# 2000kbps (标准质量)
-b:v 2000k

# 4000kbps (高质量)
-b:v 4000k
```

### 3. x264 参数优化
```bash
# 超低延迟预设
-preset ultrafast -tune zerolatency

# GOP 设置 (关键帧间隔)
-g 60  # 2 秒 @ 30fps
```

---

## 🔧 故障排查

### 问题 1: WebRTC 连接失败
```bash
# 检查 SRS 是否运行
docker ps | grep srs

# 检查端口
netstat -tulpn | grep :8000
```

### 问题 2: 有画面但延迟高
- 检查网络带宽
- 降低码率到 1000k
- 使用 `ultrafast` 预设

### 问题 3: 画面卡顿
- 检查 CPU 使用率
- 降低分辨率到 640x480
- 降低帧率到 15fps

---

## ✅ 完整测试流程

### 小车端：
```bash
# 1. 启动摄像头
ros2 launch usb_cam cam_vehicle.launch.py

# 2. 推流到 SRS
./start_stream.sh
```

### 云端：
```bash
# 确认 SRS 运行
docker ps | grep srs
```

### 前端：
```bash
# 1. 配置 SRS IP
编辑 src/services/vehicleConnection.ts

# 2. 启动 Web 平台
npm run dev

# 3. 浏览器访问
http://localhost:5173
```

---

## 🎯 预期效果

| 指标 | 目标值 |
|------|--------|
| 延迟 | 200-500ms |
| 帧率 | 20-30fps |
| 分辨率 | 720p |
| 带宽 | 1-3Mbps |

---

## 📚 参考链接

- [SRS GitHub](https://github.com/ossrs/srs)
- [SRS WebRTC 文档](https://ossrs.net/lts/zh-cn/docs/v5/doc/webrtc)
- [WebRTC API](https://developer.mozilla.org/zh-CN/docs/Web/API/WebRTC_API)

---

**部署完成后，你将获得 <500ms 的超低延迟视频流！** 🎉

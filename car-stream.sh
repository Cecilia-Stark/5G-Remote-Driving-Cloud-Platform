#!/bin/bash
# 小车端 FFmpeg 推流脚本
# 功能：将摄像头视频推流到 SRS 服务器

# ==================== 配置区 ====================
# 请修改为你的 SRS 服务器 IP 地址
SRS_SERVER_IP="192.168.1.100"

# 摄像头设备 (通常是 /dev/video0)
CAMERA_DEVICE="/dev/video0"

# 视频参数
VIDEO_WIDTH=1280
VIDEO_HEIGHT=720
FRAMERATE=30
BITRATE=2000k
GOP=60
# ===============================================

# 推流地址
RTMP_URL="rtmp://${SRS_SERVER_IP}/live/car_front"

echo "=========================================="
echo "  小车视频推流"
echo "=========================================="
echo "  SRS 服务器：$SRS_SERVER_IP"
echo "  摄像头：$CAMERA_DEVICE"
echo "  分辨率：${VIDEO_WIDTH}x${VIDEO_HEIGHT}"
echo "  帧率：$FRAMERATE fps"
echo "  码率：$BITRATE"
echo "  推流地址：$RTMP_URL"
echo "=========================================="
echo ""

# 检查摄像头
if [ ! -e "$CAMERA_DEVICE" ]; then
    echo "❌ 摄像头设备不存在：$CAMERA_DEVICE"
    echo "   请检查摄像头是否连接"
    exit 1
fi

echo "✅ 摄像头已检测到"
echo ""
echo "📺 开始推流...(按 Ctrl+C 停止)"
echo ""

# 启动 FFmpeg 推流
ffmpeg -f v4l2 -i ${CAMERA_DEVICE} \
  -video_size ${VIDEO_WIDTH}x${VIDEO_HEIGHT} \
  -framerate ${FRAMERATE} \
  -c:v libx264 -preset ultrafast -tune zerolatency \
  -b:v ${BITRATE} -g ${GOP} \
  -pix_fmt yuv420p \
  -f flv "${RTMP_URL}"

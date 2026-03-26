#!/bin/bash
# 小车一键启动脚本
# 功能：启动底盘、摄像头、Web 控制服务器

echo "=========================================="
echo "  小车控制服务启动脚本"
echo "=========================================="

# 加载 ROS2 环境
source ~/wheeltec/wheeltec_robot/wheeltec_ros2/install/setup.bash
source /opt/ros/humble/setup.bash

echo ""
echo "[1/4] 启动机器人底盘..."
ros2 launch turn_on_wheeltec_robot base_serial.launch.py &
sleep 3

echo "[2/4] 启动 USB 摄像头..."
ros2 launch usb_cam cam_vehicle.launch.py &
sleep 2

echo "[3/4] 启动 Web 视频服务器..."
ros2 run web_video_server web_video_server &
sleep 2

echo "[4/4] 启动 G29 控制接收服务器..."
cd ~
python3 robot_web_control.py &
sleep 2

echo ""
echo "=========================================="
echo "  ✅ 所有服务启动完成！"
echo "=========================================="
echo ""

# 获取小车 IP
IP=$(hostname -I | awk '{print $1}')
echo "  📹 视频流地址：http://$IP:8000/mjpeg"
echo "  🎮 控制接口：http://$IP:8000/control"
echo "  🔌 G29 监听端口：5000"
echo ""
echo "  💡 提示："
echo "  1. 在电脑浏览器访问 Web 平台"
echo "  2. 配置小车 IP 为：$IP"
echo "  3. 点击'远程接管'开始控制"
echo "  4. 在电脑运行：python g29_sender.py"
echo ""
echo "  按 Ctrl+C 停止所有服务"
echo "=========================================="
echo ""

# 等待所有后台进程
wait

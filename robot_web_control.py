#!/usr/bin/env python3
"""
小车端 G29 接收 + 视频流转发服务器
功能：
1. TCP 5000 端口接收 G29 方向盘数据
2. 发布 ROS2 指令控制小车运动
3. HTTP 8000 端口转发摄像头视频流（MJPEG）
4. HTTP 8000 端口接收 Web 控制指令（备用）
"""

import http.server
import socketserver
import json
import socket
import urllib.request
import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist
import threading
import re
import time
import sys
import signal

# ==================== 配置区 ====================
TCP_PORT = 5000          # G29 数据接收端口
HTTP_PORT = 8000         # Web 控制 + 视频流端口
VIDEO_PORT = 8080        # web_video_server 端口
VIDEO_TOPIC = '/image_raw'  # 摄像头话题
# ===============================================


class G29ControlNode(Node):
    """G29 方向盘控制 ROS2 节点"""
    
    def __init__(self):
        super().__init__('g29_control')
        
        # 发布速度指令到底盘
        self.publisher_ = self.create_publisher(Twist, '/cmd_vel', 10)
        
        # G29 数据
        self.steer = 0.0
        self.throttle = 0.0
        self.brake = 0.0
        
        # 键盘控制数据（备用）
        self.keyboard_linear = 0.0
        self.keyboard_angular = 0.0
        
        # 控制模式：True=键盘，False=G29
        self.use_keyboard = False
        self.stop_flag = False
        
        # 持续控制循环（每 50ms 发布一次指令）
        self.create_timer(0.05, self.control_loop)
        
        # G29 TCP 接收线程
        self.g29_thread = threading.Thread(target=self.start_g29_server, daemon=True)
        self.g29_thread.start()
        
        self.get_logger().info("G29 控制节点已初始化")

    def control_loop(self):
        """控制循环 - 每 50ms 执行一次"""
        if self.stop_flag:
            return
        
        twist = Twist()
        
        if self.use_keyboard:
            # 键盘控制模式
            twist.linear.x = self.keyboard_linear
            twist.angular.z = self.keyboard_angular
        else:
            # G29 方向盘控制模式
            if self.brake > 10:
                # 踩刹车时停止
                twist.linear.x = 0.0
                twist.angular.z = 0.0
            else:
                # 油门映射：0-100% → 0-2.0 m/s
                twist.linear.x = (self.throttle / 100.0) * 2.0
                
                # 方向盘映射：±45° → ±1.5 rad/s
                if abs(self.steer) < 5.0:
                    # 死区设置
                    twist.angular.z = 0.0
                else:
                    twist.angular.z = -(self.steer / 45.0) * 1.5
        
        self.publisher_.publish(twist)

    def start_g29_server(self):
        """启动 TCP 服务器接收 G29 数据"""
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            s.bind(('0.0.0.0', TCP_PORT))
            s.listen()
            
            self.get_logger().info(f"G29 TCP 服务器已启动，监听端口 {TCP_PORT}")
            
            while not self.stop_flag and rclpy.ok():
                try:
                    conn, addr = s.accept()
                    self.get_logger().info(f"G29 已连接：{addr}")
                    
                    # 每个客户端一个线程处理
                    threading.Thread(
                        target=self.handle_g29_client, 
                        args=(conn, addr), 
                        daemon=True
                    ).start()
                except Exception as e:
                    break

    def handle_g29_client(self, conn, addr):
        """处理 G29 客户端连接"""
        buffer = ""
        with conn:
            try:
                conn.sendall(b"Ready\n")
                while not self.stop_flag and rclpy.ok():
                    data = conn.recv(4096)
                    if not data:
                        break
                    
                    buffer += data.decode('utf-8', errors='ignore')
                    
                    # 按行解析数据
                    while '\n' in buffer:
                        line, buffer = buffer.split('\n', 1)
                        line = line.strip()
                        if not line:
                            continue
                        
                        # 解析格式：steer=-15.5,throttle=50.0,brake=0.0
                        match = re.match(
                            r'steer=(-?[\d.]+),throttle=([\d.]+),brake=([\d.]+)', 
                            line
                        )
                        if match:
                            try:
                                steer_str, throttle_str, brake_str = match.groups()
                                self.steer = float(steer_str)
                                self.throttle = float(throttle_str)
                                self.brake = float(brake_str)
                                
                                # 发送确认
                                conn.sendall(b"OK\n")
                            except ValueError:
                                pass
            except Exception as e:
                pass
        
        self.get_logger().info(f"G29 已断开：{addr}")

    def shutdown(self):
        """关闭节点"""
        self.stop_flag = True
        time.sleep(0.2)
        
        # 发送停止指令
        try:
            self.publisher_.publish(Twist())
        except:
            pass
        
        try:
            self.destroy_node()
        except:
            pass


# ==================== HTTP Web 服务器 ====================

class WebControlHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP Web 控制处理器"""
    
    # 全局引用 G29 节点
    robot_node = None
    
    def do_OPTIONS(self):
        """处理 CORS 预检请求"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Connection', 'close')
        self.end_headers()
    
    def do_GET(self):
        """处理 GET 请求"""
        if self.path.startswith('/mjpeg'):
            # 转发视频流
            self.handle_mjpeg_stream()
        elif self.path in ['/', '/control']:
            # 返回控制页面
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.send_header('Cache-Control', 'no-cache')
            self.send_header('Connection', 'close')
            self.end_headers()
            html = f"""<!DOCTYPE html>
<html>
<head><title>小车控制</title></head>
<body>
<h1>小车控制服务器运行中</h1>
<p>视频流：<a href="/mjpeg">/mjpeg</a></p>
<p>小车 IP: {socket.gethostbyname(socket.gethostname())}</p>
</body>
</html>"""
            self.wfile.write(html.encode('utf-8'))
        else:
            super().do_GET()
    
    def handle_mjpeg_stream(self):
        """转发 MJPEG 视频流"""
        try:
            source_url = f'http://127.0.0.1:{VIDEO_PORT}/stream?topic={VIDEO_TOPIC}'
            req = urllib.request.Request(source_url)
            remote = urllib.request.urlopen(req, timeout=10)

            content_type = remote.headers.get('Content-Type', '')
            boundary_match = re.search(r'boundary=([^\s;]+)', content_type, re.IGNORECASE)
            boundary = boundary_match.group(1).strip('\'"') if boundary_match else 'myboundary'

            self.send_response(200)
            self.send_header('Content-Type', f'multipart/x-mixed-replace; boundary={boundary}')
            self.send_header('Cache-Control', 'no-cache')
            self.send_header('Connection', 'close')
            self.end_headers()

            while True:
                chunk = remote.read(65536)
                if not chunk:
                    break
                self.wfile.write(chunk)
                self.wfile.flush()
        except Exception as e:
            print(f"视频流错误：{e}")
    
    def do_POST(self):
        """处理 POST 控制指令"""
        if self.path == '/control':
            try:
                content_length = int(self.headers['Content-Length'])
                raw = self.rfile.read(content_length).decode('utf-8')
                data = json.loads(raw)
                cmd_type = data.get('type')
                
                if self.robot_node:
                    if cmd_type == 'set_vel':
                        value = data.get('value', {})
                        self.robot_node.keyboard_linear = float(value.get('linear', 0.0))
                        self.robot_node.keyboard_angular = float(value.get('angular', 0.0))
                        print(f"[Web] 前进：{self.robot_node.keyboard_linear:.2f} m/s")
                        response = {'status': 'ok', 'mode': self.robot_node.use_keyboard}
                    
                    elif cmd_type == 'stop':
                        self.robot_node.keyboard_linear = 0.0
                        self.robot_node.keyboard_angular = 0.0
                        print("[Web] 停止")
                        response = {'status': 'ok', 'mode': self.robot_node.use_keyboard}
                    
                    elif cmd_type == 'toggle_mode':
                        self.robot_node.use_keyboard = not self.robot_node.use_keyboard
                        mode_str = '键盘' if self.robot_node.use_keyboard else 'G29'
                        print(f"[Web] 模式切换 -> {mode_str}")
                        response = {'status': 'ok', 'mode': self.robot_node.use_keyboard}
                    else:
                        response = {'status': 'error', 'message': '未知命令'}
                else:
                    response = {'status': 'error', 'message': '节点未初始化'}
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Connection', 'close')
                self.end_headers()
                self.wfile.write(json.dumps(response).encode('utf-8'))
            except Exception as e:
                response = {'status': 'error', 'message': str(e)}
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(response).encode('utf-8'))
        else:
            super().do_POST()
    
    def log_message(self, format, *args):
        """禁用日志输出"""
        pass


class ThreadedTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    daemon_threads = True
    allow_reuse_address = True


def get_local_ip():
    """获取本机 IP 地址"""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 80))
        return s.getsockname()[0]
    except:
        return '127.0.0.1'
    finally:
        s.close()


# ==================== 主程序 ====================

def main():
    # 初始化 ROS2
    rclpy.init()
    
    # 创建 G29 控制节点
    robot = G29ControlNode()
    
    # 设置 HTTP 服务器的节点引用
    WebControlHandler.robot_node = robot
    
    # 获取本机 IP
    local_ip = get_local_ip()
    
    # 创建 HTTP 服务器
    server = ThreadedTCPServer(("", HTTP_PORT), WebControlHandler)
    
    print("\n" + "=" * 60)
    print("  小车控制服务器启动成功！")
    print("=" * 60)
    print(f"\n  视频流地址：http://{local_ip}:{HTTP_PORT}/mjpeg")
    print(f"  控制接口：http://{local_ip}:{HTTP_PORT}/control")
    print(f"  G29 监听端口：{TCP_PORT}")
    print("\n  按 Ctrl+C 退出\n")
    print("=" * 60 + "\n")
    
    # 信号处理
    def signal_handler(sig, frame):
        print("\n正在退出...")
        robot.shutdown()
        server.shutdown()
        server.server_close()
        rclpy.shutdown()
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        # 启动 HTTP 服务器线程
        serve_thread = threading.Thread(target=server.serve_forever, daemon=True)
        serve_thread.start()
        
        # 运行 ROS2 节点
        while rclpy.ok() and not robot.stop_flag:
            rclpy.spin_once(robot, timeout_sec=0.1)
    except KeyboardInterrupt:
        print("\n退出\n")
    finally:
        robot.shutdown()
        server.shutdown()
        server.server_close()
        rclpy.shutdown()


if __name__ == '__main__':
    main()

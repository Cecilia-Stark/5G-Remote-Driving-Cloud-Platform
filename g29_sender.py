#!/usr/bin/env python3
"""
G29 方向盘发送端 - 电脑版
功能：
1. 读取罗技 G29 方向盘数据
2. 通过 TCP 发送到小车（控制小车运动）
3. 通过 WebSocket 发送到 Web 前端（UI 显示）
"""

import socket
import hid
import time
import sys
import threading
import json

try:
    from websocket_server import WebsocketServer, WebsocketServerThread
except ImportError:
    print("错误：需要安装 websocket-server")
    print("请运行：pip install websocket-server")
    sys.exit(1)

# ==================== 配置区 ====================
# ⚠️ 小车 IP 地址 - 请根据实际情况修改
CAR_SERVER_IP = '192.168.1.100'
CAR_SERVER_PORT = 5000

# WebSocket 服务器端口（Web 前端监听 8080）
WS_HOST = 'localhost'
WS_PORT = 8080

# 重连延迟（秒）
RECONNECT_DELAY = 2.0
# ===============================================


def get_g29_device():
    """连接 G29 方向盘"""
    print("\n[1] 连接 G29 方向盘...")
    try:
        device = hid.device()
        device.open(0x046D, 0xC24F)  # 罗技 G29 Vendor ID: 0x046D, Product ID: 0xC24F
        device.set_nonblocking(False)
        print(" ✓ G29 连接成功。")
        return device
    except Exception as e:
        print(f" ✗ 错误：无法连接 G29: {e}")
        print(" 请检查:")
        print(" 1. G29 是否已 USB 连接到电脑")
        print(" 2. 是否已安装 hidapi 库 (pip install hidapi)")
        print(" 3. 驱动程序是否正确安装")
        return None


def connect_to_car():
    """连接到小车 TCP 服务器"""
    print(f"\n[2] 连接小车 {CAR_SERVER_IP}:{CAR_SERVER_PORT}...")
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(5.0)
    try:
        s.connect((CAR_SERVER_IP, CAR_SERVER_PORT))
        s.setblocking(False)
        print(" ✓ 小车连接成功！")
        return s
    except socket.timeout:
        print(" ✗ 错误：连接超时 (5 秒)")
        print(" 请检查:")
        print(" 1. 小车是否开机并运行接收端 (robot_web_control.py)")
        print(" 2. 两台机器是否在同一网络")
        print(" 3. 防火墙是否阻止 5000 端口")
    except ConnectionRefusedError:
        print(" ✗ 错误：连接被拒绝")
        print(" 接收端可能没有运行，或 IP 地址不正确")
    except OSError as e:
        print(f" ✗ 错误：{e}")
    except Exception as e:
        print(f" ✗ 错误：{e}")
    s.close()
    return None


def start_websocket_server():
    """启动 WebSocket 服务器（用于 Web 前端 UI 显示）"""
    print(f"\n[3] 启动 WebSocket 服务器 {WS_HOST}:{WS_PORT}...")
    
    def new_client(client, server):
        print(f" ✓ Web 前端已连接")
    
    def client_left(client, server):
        print(f" ❌ Web 前端已断开")
    
    def message_received(client, server, message):
        # 不需要处理前端消息
        pass
    
    server = WebsocketServer(host=WS_HOST, port=WS_PORT)
    server.set_fn_new_client(new_client)
    server.set_fn_client_left(client_left)
    server.set_fn_message_received(message_received)
    
    # 在独立线程中运行
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()
    
    print(f" ✓ WebSocket 服务器已启动")
    return server


def send_to_websocket(server, steering, throttle, brake):
    """发送数据到 Web 前端"""
    try:
        data = json.dumps({
            'status': 'connected',
            'steering': round(steering, 1),
            'throttle': round(throttle, 1),
            'brake': round(brake, 1)
        })
        server.send_message_to_all(data)
    except Exception as e:
        pass


def main():
    print("=" * 60)
    print(" G29 方向盘发送端")
    print("=" * 60)
    print(f" 目标小车：{CAR_SERVER_IP}:{CAR_SERVER_PORT}")
    print(f" WebSocket: {WS_HOST}:{WS_PORT}")
    print("=" * 60)
    
    # 1. 连接 G29
    device = get_g29_device()
    if device is None:
        sys.exit(1)
    
    # 2. 启动 WebSocket 服务器
    ws_server = start_websocket_server()
    
    # 3. 主循环
    car_socket = None
    send_count = 0
    
    print(f"\n[4] 开始发送数据...")
    print(" 按 Ctrl+C 停止\n")
    
    try:
        while True:
            # 如果小车断开，尝试重连
            if car_socket is None:
                car_socket = connect_to_car()
                if car_socket is None:
                    print(f" {RECONNECT_DELAY} 秒后重试...\n")
                    time.sleep(RECONNECT_DELAY)
                    continue
            
            try:
                # 读取 G29 数据
                buffer = device.read(64, timeout_ms=100)
                if len(buffer) < 8:
                    continue

                # 解析方向盘数据
                steeringRaw = buffer[4] | (buffer[5] << 8)
                steeringSigned = steeringRaw - 32768
                steering = steeringSigned / 32768.0 * 450.0

                throttleRaw = buffer[6]
                throttle = (255 - throttleRaw) / 255.0 * 100.0

                brakeRaw = buffer[7]
                brake = (255 - brakeRaw) / 255.0 * 100.0

                # 发送到小车
                cmd = f"steer={steering:.2f},throttle={throttle:.2f},brake={brake:.2f}\n"
                try:
                    car_socket.send(cmd.encode())
                    
                    # 同时发送到 Web 前端（UI 显示）
                    send_to_websocket(ws_server, steering, throttle, brake)
                    
                    send_count += 1
                    
                    # 每 100 条打印一次状态
                    if send_count % 100 == 0:
                        print(f" 已发送 {send_count} 条 | "
                              f"转向:{steering:6.1f}° 油门:{throttle:5.1f}% 刹车:{brake:5.1f}%")
                    
                    # 接收小车确认
                    try:
                        response = car_socket.recv(1024).decode().strip()
                        if response and response != "OK":
                            print(f" 收到小车：{response}")
                    except BlockingIOError:
                        pass
                    except Exception:
                        pass
                        
                except (socket.error, BrokenPipeError, ConnectionResetError) as e:
                    print(f"\n ✗ 小车连接断开：{e}")
                    car_socket.close()
                    car_socket = None
                    continue
                    
            except KeyboardInterrupt:
                print("\n\n用户中断，退出...")
                break
            except Exception as e:
                print(f"\n ✗ 错误：{e}")
                if car_socket:
                    car_socket.close()
                car_socket = None
                time.sleep(1)

    except KeyboardInterrupt:
        print("\n\n用户中断，退出...")
    finally:
        device.close()
        if car_socket:
            car_socket.close()
        print("\n连接已关闭。")


if __name__ == '__main__':
    main()

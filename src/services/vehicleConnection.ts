import { Gear, VehicleStatus, VehicleTelemetry } from '../types';

/**
 * 服务层: 车辆通讯连接管理 (Vehicle Connection Service)
 * 
 * =========================================================================
 * 核心功能：
 * 1. 遥测数据 (Telemetry): 处理 WebSocket 数据 (速度、转角、位置)。
 * 2. 视频流 (WebRTC): 管理与流媒体服务器的 P2P 连接。
 * =========================================================================
 */

type TelemetryCallback = (data: VehicleTelemetry) => void;
type StreamCallback = (stream: MediaStream) => void;

class VehicleConnectionService {
  private subscribers: TelemetryCallback[] = [];
  
  // --- 模拟相关变量 ---
  private intervalId: any = null;
  private currentData: VehicleTelemetry = this.getInitialData();
  private isSimulatingAnomaly: boolean = false;

  // --- WebRTC 视频流相关变量 ---
  private pc: RTCPeerConnection | null = null;
  private streamCallback: StreamCallback | null = null;

  private getInitialData(): VehicleTelemetry {
    return {
      timestamp: Date.now(),
      speedKmh: 0,
      rpm: 800,
      gear: Gear.P,
      steeringAngle: 0,
      batteryLevel: 85,
      temperature: 36,
      // 东南大学成贤学院 (大致坐标)
      latitude: 32.1633, 
      longitude: 118.6985,
      latencyMs: 15,
      status: VehicleStatus.NORMAL
    };
  }

  // ============================================================
  //  1. 遥测数据连接 (WebSocket)
  // ============================================================
  public connect() {
    console.log("正在初始化 5G 连接...");

    // ------------------------------------------------------------
    // [填空区 A]: 遥测数据 WebSocket 连接
    // ------------------------------------------------------------
    // const socket = new WebSocket('wss://your-cloud-server.com/api/telemetry');
    // socket.onmessage = (e) => {
    //   const data = JSON.parse(e.data);
    //   this.notifySubscribers(data);
    // };
    // ------------------------------------------------------------

    // 演示模式：启动定时器产生模拟数据
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = setInterval(() => {
      this.simulateNewDataFrame(); 
      this.notifySubscribers(this.currentData);
    }, 200); 

    // 初始化视频连接
    this.startWebRTCStream();
  }

  public disconnect() {
    if (this.intervalId) clearInterval(this.intervalId);
    
    // 关闭视频流
    if (this.pc) {
        this.pc.close();
        this.pc = null;
    }
    console.log("连接已关闭");
  }

  public subscribe(callback: TelemetryCallback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  // 注册视频流回调，让组件能拿到 MediaStream
  public onVideoStream(callback: StreamCallback) {
      this.streamCallback = callback;
  }

  private notifySubscribers(data: VehicleTelemetry) {
    this.subscribers.forEach(cb => cb(data));
  }

  // ============================================================
  //  2. 视频流连接 (WebRTC) - 核心部分
  // ============================================================
  /**
   * 真实场景下，前端需要从流媒体服务器(如 SRS, Janus) 拉取 WebRTC 流
   * 以下代码演示了标准的 WebRTC 拉流流程 (以 SRS 为例)
   */
  private async startWebRTCStream() {
      console.log("正在尝试建立 WebRTC 视频连接...");

      const SRS_SERVER_IP = localStorage.getItem('srs_server_ip') || '127.0.0.1';
      const USE_WEBRTC = localStorage.getItem('use_webrtc') === 'true';
      
      if (!USE_WEBRTC) {
          console.log("⚠️ 未启用 WebRTC，使用 HTTP MJPEG 模式");
          return;
      }

      const WEBRTC_API_URL = `http://${SRS_SERVER_IP}:1985/rtc/v1/play/`;
      const STREAM_URL = `webrtc://${SRS_SERVER_IP}/live/car_front`;

      try {
          // 1. 创建 RTCPeerConnection
          // STUN 服务器帮助我们穿透 NAT，这里使用 Google 的公共服务
          this.pc = new RTCPeerConnection({
              iceServers: [{ urls: "stun:stun.l.google.com:19302" }] 
          });

          // 2. 监听远程流 (Track 事件)
          // 当连接建立成功，SRS 发送视频流时触发
          this.pc.addTransceiver("audio", { direction: "recvonly" });
          this.pc.addTransceiver("video", { direction: "recvonly" });

          this.pc.ontrack = (event) => {
              console.log("收到远程视频流轨道", event.streams[0]);
              if (this.streamCallback && event.streams[0]) {
                  this.streamCallback(event.streams[0]);
              }
          };

          // 3. 创建 Offer (SDP)
          const offer = await this.pc.createOffer();
          await this.pc.setLocalDescription(offer);

          // 4. 信令交换 (Signaling) - 发送 Offer 到服务器，换取 Answer
          // 注意：不同服务器(SRS, Janus) 的信令协议格式不同，以下是 SRS 的标准格式
          const response = await fetch(WEBRTC_API_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  api: WEBRTC_API_URL,
                  streamurl: STREAM_URL,
                  sdp: offer.sdp
              })
          });

          // 检查网络请求
          if (!response.ok) {
              console.warn(`无法连接流媒体服务器 (${SRS_SERVER_IP})。如果你没有运行 Docker SRS，这是正常的。`);
              return;
          }

          const data = await response.json();
          if (data.code !== 0) {
              throw new Error(`SRS Server Error: ${data.msg}`);
          }

          // 5. 设置远程 Answer (SDP)
          await this.pc.setRemoteDescription(new RTCSessionDescription({
              type: 'answer',
              sdp: data.sdp
          }));

          console.log("WebRTC 连接建立成功! 等待视频流...");

      } catch (error) {
          console.error("WebRTC 连接流程失败:", error);
          console.log("提示: 请确保已运行 Docker SRS 并且已开始推流。查看 README.md 获取帮助。");
      }
  }

  // ============================================================
  //  3. 控制指令 & 模拟逻辑
  // ============================================================
  public sendControlCommand(command: string, value: any) {
    console.log(`[指令下发 Cloud->Car] ${command}:`, value);
    // [填空区 C]: 通过 WebSocket 发送控制指令
    // 在这里实现您提到的 "通过后端操作把舱端和车端联结在一起"
    // 
    // 流程说明:
    // 1. 发送 JSON: socket.send(JSON.stringify({ cmd: command, val: value }));
    // 2. 云端收到 TAKEOVER_REQUEST，验证权限。
    // 3. 云端向车端发送指令，要求切换到远程控制模式。
    // 4. 车端响应 Ready 后，云端建立 WebRTC DataChannel 或 UDP 隧道。
    // 5. 前端跳转到 ControlView，开始发送方向盘/油门数据。
  }

  public triggerManualTakeover() {
    this.sendControlCommand('TAKEOVER_REQUEST', true);
  }

  // 发送释放控制指令，结束远程接管
  public triggerControlRelease() {
    this.sendControlCommand('CONTROL_RELEASE', true);
    // 如果处于模拟异常状态，自动消除异常，让车恢复正常
    if (this.isSimulatingAnomaly) {
        this.isSimulatingAnomaly = false;
        // 强制重置状态为 NORMAL
        this.currentData.status = VehicleStatus.NORMAL;
    }
  }

  public toggleSimulationAnomaly() {
    this.isSimulatingAnomaly = !this.isSimulatingAnomaly;
  }

  private simulateNewDataFrame() {
    const isMoving = this.currentData.gear === Gear.D;
    
    let newSpeed = this.currentData.speedKmh;
    let newRpm = this.currentData.rpm;

    if (isMoving) {
        newSpeed = Math.min(120, Math.max(0, newSpeed + (Math.random() - 0.4)));
        newRpm = 1500 + (newSpeed * 30);
    } else {
        newSpeed = 0;
        newRpm = 800 + Math.random() * 50;
    }

    const newSteering = this.currentData.steeringAngle + (Math.random() * 10 - 5);
    // 模拟车辆缓慢移动 (经纬度微小变化)
    let newLat = this.currentData.latitude;
    let newLng = this.currentData.longitude;
    
    if (isMoving) {
        newLat += 0.00005 * (newSpeed / 30); 
    }

    let status = VehicleStatus.NORMAL;
    let errorMessage = undefined;

    if (this.isSimulatingAnomaly) {
        status = VehicleStatus.CRITICAL;
        errorMessage = "前向雷达遮挡"; 
    }

    this.currentData = {
      ...this.currentData,
      timestamp: Date.now(),
      speedKmh: parseFloat(newSpeed.toFixed(1)),
      rpm: Math.floor(newRpm),
      steeringAngle: Math.max(-450, Math.min(450, newSteering)),
      latitude: newLat,
      longitude: newLng,
      status: status,
      errorMessage: errorMessage,
      latencyMs: 15 + Math.floor(Math.random() * 20)
    };
  }
  
  public setGear(gear: Gear) {
      this.currentData.gear = gear;
  }
}

export const vehicleService = new VehicleConnectionService();
// 小车控制服务 - 通过 HTTP 发送指令到小车

// ⚠️ 小车 IP 地址 - 已通过 Web 界面配置
// 使用本地视频代理解决跨域问题
let CAR_IP = localStorage.getItem('car_ip') || 'localhost';
const CAR_PORT = 8000;
const PROXY_PORT = 8001;
const CONTROL_URL = `http://${CAR_IP}:${CAR_PORT}/control`;
// 视频流通过本地代理转发（解决跨域和网络问题）
const VIDEO_URL = `http://localhost:${PROXY_PORT}/`;

export interface CarControlState {
  linear: number;
  angular: number;
}

/**
 * 发送控制指令到小车
 */
export async function sendCarCommand(type: string, value?: any): Promise<void> {
  try {
    const response = await fetch(CONTROL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, value })
    });
    
    if (!response.ok) {
      console.error('小车控制指令失败:', response.status);
    }
  } catch (error) {
    console.error('发送控制指令错误:', error);
    throw error;
  }
}

/**
 * 发送速度指令
 */
export async function sendVelocityCommand(linear: number, angular: number): Promise<void> {
  return sendCarCommand('set_vel', { linear, angular });
}

/**
 * 发送停止指令
 */
export async function sendStopCommand(): Promise<void> {
  return sendCarCommand('stop');
}

/**
 * 切换控制模式 (键盘/G29)
 */
export async function toggleControlMode(): Promise<void> {
  return sendCarCommand('toggle_mode');
}

/**
 * 获取小车 IP 地址
 */
export function getCarIp(): string {
  return CAR_IP;
}

/**
 * 设置小车 IP 地址
 */
export function setCarIp(ip: string): void {
  CAR_IP = ip;
  localStorage.setItem('car_ip', ip);
}

/**
 * 获取视频流 URL
 */
export function getVideoUrl(): string {
  return VIDEO_URL;
}

export { CAR_IP, VIDEO_URL };

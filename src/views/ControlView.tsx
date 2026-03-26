import React, { useState, useEffect } from 'react';
import { VehicleTelemetry, Gear } from '../types';
import { CarVideoFeed } from '../components/CarVideoFeed';
import { MapContainer } from '../components/MapContainer';
import { Save, LogOut, Settings, Wifi } from 'lucide-react';
import { sendVelocityCommand, sendStopCommand, setCarIp, getCarIp } from '../services/carControl';

interface ControlViewProps {
    telemetry: VehicleTelemetry;
    onExitControl: () => void;
}

export const ControlView: React.FC<ControlViewProps> = ({ telemetry, onExitControl }) => {

    // G29 外设数据状态
    const [g29Data, setG29Data] = useState({
        status: 'connecting',
        steering: 0,
        throttle: 0,
        brake: 0,
        message: ''
    });

    // 小车 IP 配置
    const [showSettings, setShowSettings] = useState(false);
    const [carIpInput, setCarIpInput] = useState(getCarIp());

    // 监听 G29 WebSocket 数据
    useEffect(() => {
        const ws = new WebSocket('ws://localhost:8080');

        ws.onopen = () => {
            setG29Data(prev => ({ ...prev, status: 'connected' }));
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.status === 'disconnected' || data.status === 'error') {
                    setG29Data(prev => ({ ...prev, status: data.status, message: data.message || '连接断开' }));
                } else {
                    setG29Data({
                        status: 'connected',
                        steering: data.steering || 0,
                        throttle: data.throttle || 0,
                        brake: data.brake || 0,
                        message: ''
                    });
                }
            } catch (e) { }
        };

        ws.onerror = () => {
            setG29Data(prev => ({ ...prev, status: 'error', message: '无法连接到方向盘服务 (请检查 node g29-server.js 是否运行)' }));
        };

        ws.onclose = () => {
            setG29Data(prev => ({ ...prev, status: 'error', message: '方向盘服务连接已断开' }));
        };

        return () => ws.close();
    }, []);

    // 将 G29 数据发送到小车
    useEffect(() => {
        if (g29Data.status !== 'connected') {
            sendStopCommand().catch(() => {});
            return;
        }

        const interval = setInterval(() => {
            if (g29Data.brake > 10) {
                sendStopCommand().catch(() => {});
            } else {
                const linear = (g29Data.throttle / 100.0) * 2.0;
                const angular = -(g29Data.steering / 45.0) * 1.5;
                sendVelocityCommand(linear, angular).catch(() => {});
            }
        }, 50);

        return () => clearInterval(interval);
    }, [g29Data.status, g29Data.steering, g29Data.throttle, g29Data.brake]);

    const steeringStyle = {
        transform: `rotate(${g29Data.steering}deg)`,
        transition: 'transform 0.05s linear'
    };

    const rpmPercent = Math.min(100, (telemetry.rpm / 8000) * 100);

    return (
        <div className="flex flex-col h-full bg-[#050510] text-white overflow-hidden font-tech">

            {/* 1. 顶部 HUD 栏 */}
            <div className="h-10 bg-[#0a0a16] border-b border-white/10 grid grid-cols-3 items-center px-4 shrink-0 z-30 relative">
                <div className="flex items-center gap-4 text-xs tracking-widest text-gray-400 truncate">
                    <span className="text-rose-500 font-bold animate-pulse whitespace-nowrap">● 实时控车</span>
                    <span className="hidden md:inline">纬度：{telemetry.latitude.toFixed(4)}</span>
                    <span className="hidden md:inline">经度：{telemetry.longitude.toFixed(4)}</span>
                </div>

                <div className="flex justify-center">
                    <h1 className="text-lg font-bold tracking-[0.2em] text-blue-500 opacity-80 whitespace-nowrap">
                        远程驾驶舱
                    </h1>
                </div>

                <div className="flex justify-end gap-2">
                    <button
                        onClick={() => setShowSettings(true)}
                        className="flex items-center gap-2 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded transition-colors font-bold tracking-wide"
                    >
                        <Settings size={14} />
                        小车 IP
                    </button>
                    <button
                        onClick={onExitControl}
                        className="flex items-center gap-2 text-xs bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded transition-colors font-bold tracking-wide shadow-lg shadow-red-900/50 group"
                    >
                        <Save size={14} className="group-hover:scale-110 transition-transform" />
                        结束接管并归档
                    </button>
                </div>
            </div>

            {/* 2. 主布局 */}
            <div className="flex-1 flex min-h-0 bg-black relative">

                {/* === 左侧：小车实时视频 (20%) === */}
                <div className="w-[20%] flex flex-col bg-black border-r border-white/10 relative z-20">
                    <CarVideoFeed
                        label="左后视角"
                        className="h-full opacity-75"
                        onError={() => console.error('小车视频连接失败')}
                    />
                </div>

                {/* === 中间：前视主摄像头 & 仪表盘 (60%) === */}
                <div className="w-[60%] flex flex-col relative bg-gradient-to-b from-gray-900 to-black">

                    {/* 主摄像头视频流 */}
                    <div className="absolute inset-0 z-0">
                        <CarVideoFeed
                            label="小车前视主摄像头"
                            className="w-full h-full"
                            onError={() => console.error('主摄像头连接失败')}
                        />
                    </div>

                    {/* G29 连接状态提示 */}
                    {g29Data.status !== 'connected' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm z-50">
                            <div className="bg-red-950/90 border border-red-500/50 p-8 rounded-2xl flex flex-col items-center shadow-[0_0_50px_rgba(220,38,38,0.3)]">
                                <Wifi size={64} className="text-red-500 mb-4 animate-pulse" />
                                <h2 className="text-2xl font-bold text-white mb-2">G29 方向盘未连接</h2>
                                <p className="text-red-300 text-sm mb-6 text-center max-w-md">
                                    请检查：<br/>
                                    1. Node.js G29 服务是否运行 (g29-server.js)<br/>
                                    2. 方向盘 USB 是否连接<br/>
                                    3. 端口 6999 是否被占用
                                </p>
                                <div className="text-xs text-gray-400 font-mono bg-black/50 px-4 py-2 rounded">
                                    当前状态：{g29Data.message || '等待连接...'}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 中央装饰 - 显示当前控制状态 */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-black/60 backdrop-blur px-4 py-2 rounded border border-white/10">
                        <div className="text-xs text-gray-400 font-mono">当前控制</div>
                        <div className="text-lg font-bold text-green-400">G29 方向盘</div>
                        <div className="text-[10px] text-gray-500 font-mono">
                            转向：{g29Data.steering.toFixed(0)}° | 油门：{g29Data.throttle.toFixed(0)}% | 刹车：{g29Data.brake.toFixed(0)}%
                        </div>
                    </div>

                    {/* === 底部仪表盘 (Dashboard) === */}
                    <div className="absolute bottom-4 left-4 right-4 h-40 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 z-20 overflow-hidden shadow-2xl flex items-center px-4 md:px-12">

                        {/* 方向盘与踏板 */}
                        <div className="flex-1 flex items-center justify-center h-full relative">

                            {/* 左侧：刹车条 - 增加间距 */}
                            <div className="absolute left-2 md:left-16 bottom-2 top-2 flex flex-col justify-end items-center">
                                <div className="text-[10px] text-gray-400 mb-1">刹车</div>
                                <div className="w-4 md:w-6 h-full bg-gray-900 rounded-md overflow-hidden relative border border-gray-700 max-h-24 shadow-inner">
                                    <div
                                        className="absolute bottom-0 left-0 right-0 bg-red-600 transition-all duration-75"
                                        style={{ height: `${g29Data.brake}%` }}
                                    />
                                </div>
                                <div className="text-[10px] md:text-xs mt-1 text-red-400 font-mono">{g29Data.brake.toFixed(0)}%</div>
                            </div>

                            {/* 方向盘 */}
                            <div className="flex flex-col items-center justify-center">
                                <div className="w-24 h-24 md:w-32 md:h-32 relative transition-transform will-change-transform" style={steeringStyle}>
                                    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl">
                                        <circle cx="50" cy="50" r="45" className="fill-none stroke-gray-300 stroke-[6]" />
                                        <path d="M5 50 A 45 45 0 0 1 20 20" className="fill-none stroke-blue-500 stroke-[6]" />
                                        <path d="M80 20 A 45 45 0 0 1 95 50" className="fill-none stroke-blue-500 stroke-[6]" />
                                        <circle cx="50" cy="50" r="12" className="fill-gray-800 stroke-gray-500 stroke-2" />
                                        <line x1="10" y1="50" x2="38" y2="50" className="stroke-gray-400 stroke-[6]" />
                                        <line x1="90" y1="50" x2="62" y2="50" className="stroke-gray-400 stroke-[6]" />
                                        <line x1="50" y1="90" x2="50" y2="62" className="stroke-gray-400 stroke-[6]" />
                                        <rect x="48" y="5" width="4" height="6" className="fill-red-500" />
                                    </svg>
                                </div>
                                <div className="mt-2 text-lg md:text-xl font-bold text-blue-300">{g29Data.steering.toFixed(0)}°</div>
                            </div>

                            {/* 右侧：油门条 - 增加间距 */}
                            <div className="absolute right-2 md:right-16 bottom-2 top-2 flex flex-col justify-end items-center">
                                <div className="text-[10px] text-gray-400 mb-1">油门</div>
                                <div className="w-4 md:w-6 h-full bg-gray-900 rounded-md overflow-hidden relative border border-gray-700 max-h-24 shadow-inner">
                                    <div
                                        className="absolute bottom-0 left-0 right-0 bg-green-500 transition-all duration-75"
                                        style={{ height: `${g29Data.throttle}%` }}
                                    />
                                </div>
                                <div className="text-[10px] md:text-xs mt-1 text-green-400 font-mono">{g29Data.throttle.toFixed(0)}%</div>
                            </div>

                        </div>

                        {/* 右侧：转速 */}
                        <div className="flex-1 flex flex-col justify-center items-end border-l border-white/5 h-3/4 pl-6">
                            <div className="flex items-baseline gap-2 mb-2">
                                <span className="text-3xl md:text-4xl font-bold text-white">{telemetry.rpm}</span>
                                <span className="text-xs text-gray-400 font-mono">RPM</span>
                            </div>

                            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mb-3">
                                <div
                                    className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-100 ease-out"
                                    style={{ width: `${rpmPercent}%` }}
                                ></div>
                            </div>

                            <div className="text-[10px] md:text-xs font-bold bg-blue-500/20 text-blue-300 px-2 py-1 md:px-3 rounded border border-blue-500/30 uppercase tracking-wider">
                                舒适模式 (Comfort)
                            </div>
                        </div>

                    </div>
                </div>

                {/* === 右侧：地图 & 网络状态 (20%) === */}
                <div className="w-[20%] flex flex-col bg-[#050514] border-l border-white/10 relative z-20">
                    <div className="absolute top-2 left-2 right-2 z-10 bg-black/80 backdrop-blur border border-white/10 rounded p-2">
                        <div className="text-[9px] text-gray-400 font-mono mb-1">小车连接</div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-blue-400 font-mono">{getCarIp()}:8000</span>
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        </div>
                    </div>
                    <MapContainer
                        lat={telemetry.latitude}
                        lng={telemetry.longitude}
                        className="w-full h-full opacity-60"
                    />
                </div>

            </div>

            {/* 小车 IP 设置弹窗 */}
            {showSettings && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="bg-[#0a0a16] border border-white/10 rounded-xl p-6 w-96 shadow-2xl">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Settings size={20} className="text-blue-500" />
                            小车网络配置
                        </h3>
                        
                        <div className="mb-4">
                            <label className="block text-xs text-gray-400 mb-2 font-mono">
                                小车 IP 地址
                            </label>
                            <input
                                type="text"
                                value={carIpInput}
                                onChange={(e) => setCarIpInput(e.target.value)}
                                placeholder="192.168.1.100"
                                className="w-full bg-black/50 border border-white/20 rounded px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        <div className="bg-blue-900/20 border border-blue-500/20 rounded p-3 mb-4">
                            <p className="text-[10px] text-blue-300 font-mono">
                                💡 提示：在小车终端运行 ifconfig 查看 IP 地址
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    setCarIp(carIpInput);
                                    setShowSettings(false);
                                    window.location.reload();
                                }}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-sm font-bold transition-colors"
                            >
                                保存并重启
                            </button>
                            <button
                                onClick={() => setShowSettings(false)}
                                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded text-sm font-bold transition-colors"
                            >
                                取消
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

import React, { useState, useEffect } from 'react';
import { VehicleTelemetry, Gear } from '../types';
import { VideoFeed } from '../components/VideoFeed';
import { MapContainer } from '../components/MapContainer';
import { Save, LogOut } from 'lucide-react';

interface ControlViewProps {
    telemetry: VehicleTelemetry;
    onExitControl: () => void;
}

export const ControlView: React.FC<ControlViewProps> = ({ telemetry, onExitControl }) => {

    // 新增：G29 外设数据状态
    const [g29Data, setG29Data] = useState({
        status: 'connecting', // 'connecting', 'connected', 'disconnected', 'error'
        steering: 0,
        throttle: 0,
        brake: 0,
        message: ''
    });

    // 新增：监听本地 Node.js 发送的 WebSocket 数据
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

    // 严格使用 G29 真实数据，如果没连上，UI 会提示，不会用原先的模拟数据
    const currentSteering = g29Data.steering;

    const steeringStyle = {
        transform: `rotate(${currentSteering}deg)`,
        transition: 'transform 0.05s linear'
    };

    const rpmPercent = Math.min(100, (telemetry.rpm / 8000) * 100);

    return (
        <div className="flex flex-col h-full bg-[#050510] text-white overflow-hidden font-tech">

            {/* 1. 顶部 HUD 栏 */}
            <div className="h-10 bg-[#0a0a16] border-b border-white/10 grid grid-cols-3 items-center px-4 shrink-0 z-30 relative">
                {/* 左侧：实时状态 */}
                <div className="flex items-center gap-4 text-xs tracking-widest text-gray-400 truncate">
                    <span className="text-rose-500 font-bold animate-pulse whitespace-nowrap">● 实时控车</span>
                    <span className="hidden md:inline">纬度: {telemetry.latitude.toFixed(4)}</span>
                    <span className="hidden md:inline">经度: {telemetry.longitude.toFixed(4)}</span>
                </div>

                {/* 中间：标题 */}
                <div className="flex justify-center">
                    <h1 className="text-lg font-bold tracking-[0.2em] text-blue-500 opacity-80 whitespace-nowrap">
                        远程驾驶舱
                    </h1>
                </div>

                {/* 右侧：退出按钮 */}
                <div className="flex justify-end">
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

                {/* === 左侧: 后视/侧视 (20%) === */}
                <div className="w-[20%] flex flex-col bg-black border-r border-white/10 relative z-20">
                    <VideoFeed
                        label="左后视角"
                        src="https://cdn.coverr.co/videos/coverr-driving-through-the-city-at-night-4527/1080p.mp4"
                        fit="cover"
                        className="h-1/2 border-b border-white/10 opacity-75"
                    />
                    <VideoFeed
                        label="右后视角"
                        src="https://cdn.coverr.co/videos/coverr-driving-through-the-city-at-night-4527/1080p.mp4"
                        fit="cover"
                        className="h-1/2 opacity-75"
                    />
                    {/* 遥测数据浮层 */}
                    <div className="absolute top-1/2 -translate-y-1/2 left-2 right-2 bg-black/80 backdrop-blur border border-white/10 p-3 rounded">
                        <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-400 font-mono">
                            <div>电池电量</div><div className="text-right text-green-400">85%</div>
                            <div>电池温度</div><div className="text-right text-yellow-400">36°C</div>
                            <div>轮胎状态</div><div className="text-right text-blue-400">正常</div>
                        </div>
                    </div>
                </div>

                {/* === 中间: 前视主画面 & 仪表盘 (60%) === */}
                <div className="w-[60%] flex flex-col relative bg-gray-900">

                    {/* 主视频流 */}
                    <VideoFeed
                        label="前向主视角"
                        src="https://cdn.coverr.co/videos/coverr-driving-on-a-road-with-snow-4513/1080p.mp4"
                        fit="cover"
                        className="absolute inset-0 z-0"
                    />

                    {/* AR 辅助线层 */}
                    <div className="absolute inset-0 pointer-events-none z-10 opacity-40">
                        <div className="absolute bottom-0 left-[20%] right-[20%] h-[40%] border-x-[2px] border-blue-400/50 transform perspective-500 rotate-x-60"></div>
                    </div>

                    {/* === 底部仪表盘 (Dashboard) === */}
                    <div className="absolute bottom-4 left-4 right-4 h-48 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 z-20 overflow-hidden shadow-2xl flex items-center px-2 md:px-8">

                        {/* 1. 左: 速度 & 档位 */}
                        <div className="flex-1 flex flex-col justify-center items-start border-r border-white/5 h-3/4 pr-2 md:pr-6">
                            <div className="flex items-baseline gap-2">
                                <span className="text-5xl md:text-7xl font-bold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                                    {Math.floor(telemetry.speedKmh)}
                                </span>
                                <span className="text-xs md:text-sm text-gray-400 font-mono tracking-widest">KM/H</span>
                            </div>
                        </div>

                        {/* 2. 中: 方向盘与踏板外设 (严格绑定 G29 状态) */}
                        <div className="flex-[0.8] flex items-center justify-center h-full relative">

                            {g29Data.status !== 'connected' && (
                                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center rounded-xl border border-red-500/30">
                                    <span className="text-red-500 mb-2 font-bold tracking-widest">⚠️ 设备未就绪</span>
                                    <span className="text-xs text-red-300 text-center px-4 font-mono">{g29Data.message || '请检查 G29 方向盘连接'}</span>
                                </div>
                            )}

                            {/* 左侧：刹车条 */}
                            <div className="absolute left-4 md:left-8 bottom-2 top-2 flex flex-col justify-end items-center">
                                <div className="text-[10px] text-gray-400 mb-1">刹车</div>
                                <div className="w-4 md:w-6 h-full bg-gray-900 rounded-md overflow-hidden relative border border-gray-700 max-h-24 shadow-inner">
                                    <div
                                        className="absolute bottom-0 left-0 right-0 bg-red-600 transition-all duration-75"
                                        style={{ height: `${g29Data.brake}%` }}
                                    />
                                </div>
                                <div className="text-[10px] md:text-xs mt-1 text-red-400 font-mono">{g29Data.brake.toFixed(0)}%</div>
                            </div>

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
                                <div className="mt-2 text-lg md:text-xl font-bold text-blue-300">{currentSteering.toFixed(0)}°</div>
                            </div>

                            {/* 右侧：油门条 */}
                            <div className="absolute right-4 md:right-8 bottom-2 top-2 flex flex-col justify-end items-center">
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

                        {/* 3. 右: 转速 */}
                        <div className="flex-1 flex flex-col justify-center items-end border-l border-white/5 h-3/4 pl-2 md:pl-6">
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

                {/* === 右侧: 地图 (20%) === */}
                <div className="w-[20%] flex flex-col bg-[#050514] border-l border-white/10 relative z-20">
                    {/* 半透明顶部条 (不遮挡) */}
                    <div className="absolute top-0 left-0 w-full p-2 bg-gradient-to-b from-black/60 to-transparent z-10 pointer-events-none">
                        <span className="text-[10px] text-gray-400 font-mono flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                            实时导航
                        </span>
                    </div>
                    {/* 地图组件 */}
                    <MapContainer
                        lat={telemetry.latitude}
                        lng={telemetry.longitude}
                        className="w-full h-full"
                    />
                </div>

            </div>
        </div>
    );
};
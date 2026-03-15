import React, { useEffect, useState } from 'react';
import { VehicleTelemetry, VehicleStatus } from '../types';
import { vehicleService } from '../services/vehicleConnection';
import { VideoFeed } from '../components/VideoFeed';
import { MapContainer } from '../components/MapContainer';
import { AlertTriangle, Activity, Wifi, Disc, Target, Gamepad2, Zap } from 'lucide-react';

interface MonitorViewProps {
  telemetry: VehicleTelemetry;
  onTakeover: () => void;
}

export const MonitorView: React.FC<MonitorViewProps> = ({ telemetry, onTakeover }) => {
  
  const isCritical = telemetry.status === VehicleStatus.CRITICAL;
  const [realtimeStream, setRealtimeStream] = useState<MediaStream | undefined>(undefined);

  // 监听服务层传来的真实视频流
  useEffect(() => {
      vehicleService.onVideoStream((stream) => {
          console.log("监控界面接收到视频流");
          setRealtimeStream(stream);
      });
  }, []);

  // 状态中文映射
  const getStatusText = (status: VehicleStatus) => {
      switch(status) {
          case VehicleStatus.NORMAL: return '系统正常';
          case VehicleStatus.WARNING: return '警告';
          case VehicleStatus.CRITICAL: return '严重故障';
          case VehicleStatus.DISCONNECTED: return '连接断开';
          default: return status;
      }
  };

  return (
    <div className="flex flex-col h-full bg-[#050510] text-white p-4 gap-4">
      {/* 状态栏 */}
      <div className="flex justify-between items-center bg-[#0a0a16] px-5 py-3 rounded-xl border border-white/5 shadow-lg relative overflow-hidden">
        {/* 装饰线条 */}
        <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
        
        <h2 className="text-xl font-tech font-bold text-white flex items-center gap-3">
            <span className="text-blue-500 tracking-wider">实时监控中心</span>
            <span className="text-xs bg-blue-900/30 text-blue-300 px-2 py-0.5 rounded border border-blue-800/50 font-mono">LIVE FEED</span>
        </h2>
        
        <div className="flex gap-6 text-sm font-tech font-medium">
            <div className="flex items-center gap-2">
                <span className="text-gray-500 text-xs tracking-wider">系统状态</span>
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${
                    isCritical 
                    ? "bg-red-900/20 border-red-500/50 text-red-400 animate-pulse" 
                    : "bg-emerald-900/20 border-emerald-500/50 text-emerald-400"
                }`}>
                    <Activity size={14} />
                    <span>{getStatusText(telemetry.status)}</span>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-gray-500 text-xs tracking-wider">网络延迟</span>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700">
                    <Wifi size={14} className={telemetry.latencyMs > 50 ? "text-yellow-500" : "text-blue-400"} />
                    <span className="font-mono">{telemetry.latencyMs}ms</span>
                </div>
            </div>
        </div>
      </div>

      {/* 主网格布局 */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        
        {/* 左侧：环视/车况 (3列) */}
        <div className="col-span-3 bg-black/40 border border-white/5 rounded-xl overflow-hidden flex flex-col relative group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-transparent z-20"></div>
          <VideoFeed 
            label="左前环视" 
            src="https://cdn.coverr.co/videos/coverr-driving-through-the-city-at-night-4527/1080p.mp4" 
            className="flex-1 opacity-80 grayscale-[30%]"
          />
          {/* 增强型 HUD */}
          <div className="absolute bottom-4 left-4 right-4 grid grid-cols-2 gap-2">
             <div className="bg-black/60 backdrop-blur border-l-2 border-blue-500 p-2">
                <div className="text-[10px] text-gray-400 tracking-widest font-tech">胎压监测</div>
                <div className="text-blue-300 font-tech text-lg font-bold">2.4 <span className="text-xs text-gray-500">bar</span></div>
             </div>
             <div className="bg-black/60 backdrop-blur border-l-2 border-green-500 p-2">
                <div className="text-[10px] text-gray-400 tracking-widest font-tech">激光雷达</div>
                <div className="text-green-300 font-tech text-lg font-bold">运行中</div>
             </div>
          </div>
        </div>

        {/* 中间：主视角 (6列) */}
        <div className="col-span-6 bg-black border border-blue-500/20 rounded-xl overflow-hidden flex flex-col relative shadow-[0_0_20px_rgba(0,0,0,0.5)]">
          
          <VideoFeed 
            label="前向主视角" 
            // 如果获取到了真实流，这里会自动使用 stream，忽略 src
            stream={realtimeStream} 
            src="https://cdn.coverr.co/videos/coverr-driving-on-a-road-with-snow-4513/1080p.mp4" 
            className="flex-1"
            overlay={
                // AR HUD 模拟
                <div className="w-full h-full relative opacity-90 pointer-events-none">
                    {/* 准星 */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                        <Target className="text-green-400/50" size={48} strokeWidth={1} />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-green-400 rounded-full"></div>
                    </div>
                    
                    {/* 透视线 */}
                    <div className="absolute top-[55%] left-[10%] right-[10%] bottom-0 border-x border-green-500/10 transform perspective-1000 rotate-x-60"></div>

                    {/* 目标框 */}
                    <div className="absolute top-[45%] left-[45%] w-20 h-16 border border-yellow-400/60 rounded-sm">
                        <div className="absolute -top-4 left-0 bg-yellow-400/20 text-yellow-300 text-[10px] px-1 font-mono">目标 ID:44</div>
                        <div className="absolute -bottom-4 right-0 text-yellow-300 text-[10px] font-mono">26m</div>
                    </div>
                </div>
            }
          />
          
          {/* 严重警告覆盖层 */}
          {isCritical && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                <div className="bg-red-950/90 border border-red-500 p-8 rounded-2xl flex flex-col items-center shadow-[0_0_50px_rgba(220,38,38,0.5)] animate-pulse">
                    <AlertTriangle size={64} className="text-red-500 mb-4" />
                    <h1 className="text-3xl font-tech font-bold text-white mb-1 tracking-widest uppercase">警告</h1>
                    <p className="text-lg text-red-300 mb-6 font-mono">检测到车辆异常</p>
                    <button 
                        onClick={onTakeover}
                        className="bg-red-600 hover:bg-red-500 text-white px-8 py-3 rounded text-lg font-bold font-tech tracking-wide transition-all hover:scale-105 shadow-lg"
                    >
                        立即启动人工接管
                    </button>
                </div>
            </div>
          )}
        </div>

        {/* 右侧：地图 (3列) */}
        <div className="col-span-3 bg-[#0a0a16] border border-white/5 rounded-xl overflow-hidden flex flex-col relative">
            <div className="absolute top-3 left-3 z-10 bg-black/80 backdrop-blur px-3 py-1 rounded border border-white/10 flex items-center gap-2">
                <Disc className="text-blue-400 animate-spin-slow" size={14} />
                <span className="text-[10px] font-tech text-gray-300 tracking-wider">高精地图图层</span>
            </div>
            <MapContainer lat={telemetry.latitude} lng={telemetry.longitude} className="flex-1" />
        </div>
      </div>

      {/* 底部控制栏 - 重新设计：以安全接管为核心 */}
      <div className="h-20 bg-[#0a0a16] rounded-xl flex items-center justify-between px-6 border border-white/5 relative overflow-hidden shadow-2xl">
         {/* 底部装饰发光 */}
         <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"></div>

         {/* 左侧信息 */}
         <div className="flex flex-col z-10 w-1/4">
            <span className="text-[10px] text-gray-500 tracking-widest font-tech uppercase mb-1">AI 智驾状态 (Autopilot Status)</span>
            <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full shadow-[0_0_5px_currentColor] ${isCritical ? 'bg-red-500 animate-ping' : 'bg-emerald-500'}`}></div>
                <span className={`font-tech font-bold tracking-wide ${isCritical ? 'text-red-400' : 'text-emerald-400'}`}>
                    {isCritical ? '等待人工介入' : '系统自动巡航中'}
                </span>
            </div>
         </div>
         
         {/* 中间：巨大的接管按钮 (核心交互区) */}
         <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
             <button 
                onClick={onTakeover}
                className="group relative flex items-center gap-4 bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white px-10 py-3 rounded-lg transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:shadow-[0_0_40px_rgba(220,38,38,0.6)] hover:scale-105 border border-red-400/30 active:scale-95"
             >
                <div className="bg-black/20 p-2 rounded-full border border-white/10 group-hover:bg-red-500 transition-colors">
                    <Gamepad2 size={24} className="group-hover:animate-pulse" />
                </div>
                <div className="flex flex-col items-start">
                    <span className="text-xl font-bold font-tech tracking-wider leading-none shadow-black drop-shadow-md">立即接管</span>
                    <span className="text-[10px] text-red-100 opacity-80 font-mono tracking-tight mt-0.5">REQUEST CONTROL</span>
                </div>
                
                {/* 装饰性扫描光效 */}
                <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
                    <div className="absolute top-0 left-[-100%] w-[50%] h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 group-hover:animate-[shimmer_1s_infinite]"></div>
                </div>
                
                {/* 紧急状态下的额外边框动画 */}
                {isCritical && (
                     <div className="absolute inset-0 rounded-lg border-2 border-red-400 animate-ping opacity-30 pointer-events-none"></div>
                )}
             </button>
         </div>

         {/* 右侧信息 */}
         <div className="flex flex-col items-end z-10 w-1/4">
             <div className="flex items-center gap-2 mb-1">
                 <Zap size={12} className="text-yellow-500" />
                 <span className="font-mono text-xs text-gray-400">控制链路延时: <span className="text-white font-bold">{telemetry.latencyMs}ms</span></span>
             </div>
             <div className="flex items-center gap-2 text-[10px] text-gray-500 bg-white/5 px-2 py-1 rounded border border-white/5">
                 <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                 终端 ID: 8849-ALPHA
             </div>
         </div>
      </div>
    </div>
  );
};
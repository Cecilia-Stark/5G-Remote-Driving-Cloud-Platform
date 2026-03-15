import React, { useState, useEffect, useRef } from 'react';
import { vehicleService } from './services/vehicleConnection';
import { VehicleTelemetry, ViewMode, VehicleStatus, DriveSessionLog } from './types';
import { MonitorView } from './views/MonitorView';
import { ControlView } from './views/ControlView';
import { HistoryView } from './views/HistoryView';
import { LoginView } from './views/LoginView';
import { Car, LogOut, Database, Monitor, Gamepad2, ShieldAlert, Signal } from 'lucide-react';

const App: React.FC = () => {
  // Application State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<ViewMode>('LOGIN');
  const [telemetry, setTelemetry] = useState<VehicleTelemetry | null>(null);
  const [currentUser, setCurrentUser] = useState<string>('');
  
  // History Logs State
  const [historyLogs, setHistoryLogs] = useState<DriveSessionLog[]>(() => {
      const saved = localStorage.getItem('drive_history_logs');
      return saved ? JSON.parse(saved) : [];
  });

  // 会话统计 Ref
  const sessionStartTimeRef = useRef<number>(0);
  const sessionEventCountRef = useRef<number>(0);
  
  // 专门用于记录“远程控制接管”开始时间的 Ref
  const controlStartTimeRef = useRef<number>(0);

  const lastStatusRef = useRef<VehicleStatus>(VehicleStatus.NORMAL);
  const viewModeRef = useRef<ViewMode>(viewMode);

  // --- Effects ---
  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  useEffect(() => {
      localStorage.setItem('drive_history_logs', JSON.stringify(historyLogs));
  }, [historyLogs]);

  useEffect(() => {
    if (isLoggedIn) {
      console.log("正在订阅遥测数据...");
      vehicleService.connect();
      setViewMode('MONITOR');

      const unsubscribe = vehicleService.subscribe((data) => {
        setTelemetry(data);
        if (data.status === VehicleStatus.CRITICAL && lastStatusRef.current !== VehicleStatus.CRITICAL) {
            sessionEventCountRef.current += 1;
            console.warn("记录事件: 检测到异常");
        }
        lastStatusRef.current = data.status;

        // 遇到严重故障自动跳转到控制页
        if (data.status === VehicleStatus.CRITICAL && viewModeRef.current !== 'CONTROL') {
            if (viewModeRef.current === 'MONITOR') {
                // 自动触发接管
                handleStartControl();
            }
        }
      });

      return () => {
        unsubscribe();
        vehicleService.disconnect();
      };
    }
  }, [isLoggedIn]);

  // --- Handlers ---
  const handleLoginSuccess = (username: string) => {
      setCurrentUser(username);
      setIsLoggedIn(true);
      sessionStartTimeRef.current = Date.now();
      sessionEventCountRef.current = 0;
      lastStatusRef.current = VehicleStatus.NORMAL;
  };

  const handleLogout = () => {
      setIsLoggedIn(false);
      setViewMode('LOGIN');
      setTelemetry(null);
      setCurrentUser('');
  };

  // 开始接管
  const handleStartControl = () => {
      vehicleService.triggerManualTakeover();
      controlStartTimeRef.current = Date.now(); // 记录接管开始时间
      setViewMode('CONTROL');
  };

  // 结束接管并生成数据
  const handleExitControl = () => {
      // 1. 发送释放控制指令给车端
      vehicleService.triggerControlRelease();

      // 2. 计算本次接管时长
      const endTime = Date.now();
      const startTime = controlStartTimeRef.current || sessionStartTimeRef.current;
      const durationSeconds = (endTime - startTime) / 1000;

      // 3. 生成接管数据日志 (DriveSessionLog)
      const newLog: DriveSessionLog = {
          id: `RC_${Date.now().toString().slice(-6)}`, // RC = Remote Control
          startTime: new Date(startTime).toLocaleString(),
          endTime: new Date(endTime).toLocaleString(),
          operator: currentUser,
          // 如果接管期间有异常，记录异常数，否则记为0或1（本次接管本身算一次事件）
          events: sessionEventCountRef.current > 0 ? sessionEventCountRef.current : 1, 
          status: 'Completed' // 接管成功完成
      };

      // 4. 保存到历史记录
      setHistoryLogs(prev => [newLog, ...prev]);
      
      // 5. 重置本次会话的异常计数（可选，看需求是累计还是分段）
      sessionEventCountRef.current = 0; 

      console.log("接管结束，数据已生成:", newLog);
      alert(`接管结束。\n持续时间: ${durationSeconds.toFixed(1)}秒\n数据已归档至“数据回放”中。`);

      // 6. 返回监控界面
      setViewMode('MONITOR');
  };

  // --- Views ---
  if (!isLoggedIn) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex flex-col h-screen bg-[#050510] overflow-hidden font-sans text-gray-200">
      
      {/* 1. 全局导航栏 */}
      <div className="h-16 bg-[#0a0a16]/90 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-6 shrink-0 z-50 shadow-lg">
          
          {/* Logo 区域 */}
          <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.5)]">
                 <Car className="text-white" size={20} />
              </div>
              <div>
                  <h1 className="font-tech text-xl font-bold text-white tracking-wider leading-none">CloudDrive <span className="text-blue-400">Pilot</span></h1>
                  <span className="text-[10px] text-gray-500 font-mono tracking-widest block mt-0.5">5G 远程驾驶云控平台</span>
              </div>
          </div>

          {/* 中间菜单 */}
          <div className="flex items-center bg-black/30 p-1 rounded-lg border border-white/5">
              <button 
                onClick={() => setViewMode('MONITOR')}
                className={`flex items-center gap-2 px-5 py-1.5 rounded-md text-sm font-tech font-bold transition-all ${viewMode === 'MONITOR' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                  <Monitor size={16} /> 实时监控
              </button>
              <button 
                onClick={() => setViewMode('CONTROL')}
                className={`flex items-center gap-2 px-5 py-1.5 rounded-md text-sm font-tech font-bold transition-all ${viewMode === 'CONTROL' ? 'bg-rose-600 text-white shadow-[0_0_10px_rgba(225,29,72,0.4)] animate-pulse-slow' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                  <Gamepad2 size={16} /> 远程控车
              </button>
              <button 
                onClick={() => setViewMode('HISTORY')}
                className={`flex items-center gap-2 px-5 py-1.5 rounded-md text-sm font-tech font-bold transition-all ${viewMode === 'HISTORY' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                  <Database size={16} /> 数据回放
              </button>
          </div>

          {/* 右侧状态区 */}
          <div className="flex items-center gap-6">
              <div className="hidden md:flex flex-col items-end text-xs">
                  <div className="flex items-center gap-2 text-gray-400 font-tech">
                      <Signal size={12} className={telemetry ? "text-green-500" : "text-red-500"} />
                      <span>{telemetry ? `${telemetry.latencyMs}ms` : '离线'}</span>
                  </div>
                  <div className="text-gray-500">操作员: <span className="text-blue-300">{currentUser}</span></div>
              </div>

              {/* 模拟控制 */}
              <button 
                onClick={() => vehicleService.toggleSimulationAnomaly()}
                className="text-[10px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 px-2 py-1 rounded hover:bg-yellow-500/20 transition-colors uppercase font-bold tracking-wider"
                title="触发模拟异常"
              >
                 模拟异常
              </button>

              <div className="h-6 w-px bg-white/10"></div>

              <button onClick={handleLogout} className="text-gray-400 hover:text-red-400 transition-colors" title="退出登录">
                  <LogOut size={20} />
              </button>
          </div>
      </div>

      {/* 2. 内容区域 */}
      <div className="flex-1 overflow-auto relative bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-100">
         {!telemetry && viewMode !== 'HISTORY' ? (
             <div className="flex h-full flex-col items-center justify-center text-blue-400 gap-4">
                 <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                 <span className="font-tech text-xl tracking-widest">正在建立 V2X 连接...</span>
             </div>
         ) : (
             <>
                {viewMode === 'MONITOR' && telemetry && (
                    <MonitorView 
                        telemetry={telemetry} 
                        onTakeover={handleStartControl} 
                    />
                )}
                {viewMode === 'CONTROL' && telemetry && (
                    <ControlView 
                        telemetry={telemetry} 
                        onExitControl={handleExitControl} 
                    />
                )}
                {viewMode === 'HISTORY' && (
                    <HistoryView 
                        logs={historyLogs} 
                        activeSession={{
                            startTime: sessionStartTimeRef.current,
                            eventCount: sessionEventCountRef.current,
                            operator: currentUser
                        }}
                    />
                )}
             </>
         )}
      </div>

    </div>
  );
};

export default App;
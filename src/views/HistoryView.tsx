import React, { useState, useEffect } from 'react';
import { DriveSessionLog } from '../types';
import { PlayCircle, Download, FileX, CheckCircle, Clock, Shield, User } from 'lucide-react';

interface ActiveSessionData {
    startTime: number;
    eventCount: number;
    operator: string;
}

interface HistoryViewProps {
  logs: DriveSessionLog[];
  activeSession?: ActiveSessionData;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ logs, activeSession }) => {
  const [currentDuration, setCurrentDuration] = useState<string>("00:00:00");

  // 实时更新当前会话的计时器
  useEffect(() => {
    if (!activeSession) return;
    
    const timer = setInterval(() => {
        const diff = Date.now() - activeSession.startTime;
        const hrs = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setCurrentDuration(`${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(timer);
  }, [activeSession]);

  return (
    <div className="p-8 bg-slate-900 min-h-full text-white space-y-8">
        
        {/* 1. 实时数据面板 */}
        {activeSession && (
            <div className="bg-gradient-to-r from-blue-900/40 to-slate-800 rounded-xl border border-blue-500/30 p-6 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Clock size={120} />
                </div>
                
                <h3 className="text-xl font-bold text-blue-300 mb-6 flex items-center gap-2">
                    <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                    当前会话录制中 (Recording)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                        <div className="flex items-center gap-2 text-gray-400 mb-2">
                            <Clock size={16} />
                            <span className="text-xs uppercase">已用时间</span>
                        </div>
                        <div className="text-3xl font-mono font-bold text-white tracking-widest">{currentDuration}</div>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                        <div className="flex items-center gap-2 text-gray-400 mb-2">
                            <Shield size={16} />
                            <span className="text-xs uppercase">检测到异常</span>
                        </div>
                        <div className={`text-3xl font-mono font-bold ${activeSession.eventCount > 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {activeSession.eventCount}
                        </div>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                         <div className="flex items-center gap-2 text-gray-400 mb-2">
                            <User size={16} />
                            <span className="text-xs uppercase">操作员</span>
                        </div>
                        <div className="text-xl font-bold text-blue-200 truncate">
                            {activeSession.operator}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* 2. 历史归档列表 */}
        <div>
            <h2 className="text-lg font-bold mb-4 text-gray-400 border-b border-gray-800 pb-2">历史记录归档</h2>
            
            {logs.length === 0 ? (
                <div className="text-center py-12 text-gray-600 bg-slate-800/30 rounded-lg border border-slate-800 border-dashed">
                    <p className="text-lg">暂无归档记录</p>
                    <p className="text-sm mt-2">当您点击右上角 "退出登录" 时，当前驾驶数据将自动保存至此处。</p>
                </div>
            ) : (
                <div className="bg-slate-800 rounded-lg overflow-hidden shadow-xl border border-slate-700">
                    <table className="w-full text-left text-sm md:text-base">
                        <thead className="bg-slate-700 text-gray-300">
                            <tr>
                                <th className="p-4">会话 ID</th>
                                <th className="p-4 hidden md:table-cell">开始时间</th>
                                <th className="p-4 hidden md:table-cell">结束时间</th>
                                <th className="p-4">事件数</th>
                                <th className="p-4">状态</th>
                                <th className="p-4">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {logs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-700/50 transition-colors">
                                    <td className="p-4 font-mono text-blue-300">{log.id}</td>
                                    <td className="p-4 hidden md:table-cell text-gray-400">{log.startTime}</td>
                                    <td className="p-4 hidden md:table-cell text-gray-400">{log.endTime}</td>
                                    <td className="p-4">
                                        {log.events > 0 ? (
                                            <span className="bg-red-900/50 text-red-300 px-2 py-1 rounded text-xs border border-red-800">{log.events} 个异常</span>
                                        ) : (
                                            <span className="text-gray-500 text-xs">无</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs flex w-fit items-center gap-1 ${log.status === 'Completed' ? 'bg-green-900/50 text-green-200 border border-green-800' : 'bg-red-900/50 text-red-200 border border-red-800'}`}>
                                            {log.status === 'Completed' ? <CheckCircle size={12}/> : <FileX size={12}/>}
                                            {log.status === 'Completed' ? '已完成' : '异常中止'}
                                        </span>
                                    </td>
                                    <td className="p-4 flex gap-2">
                                        <button className="text-blue-400 hover:text-white transition-colors" title="回放">
                                            <PlayCircle size={18} />
                                        </button>
                                        <button className="text-gray-400 hover:text-white transition-colors" title="下载日志">
                                            <Download size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            
            {logs.length > 0 && (
                <div className="mt-4 text-right">
                    <button 
                        onClick={() => {
                            if (window.confirm('确定要清除所有本地历史记录吗？')) {
                                localStorage.removeItem('drive_history_logs');
                                window.location.reload();
                            }
                        }}
                        className="text-xs text-red-500 hover:text-red-400 hover:underline"
                    >
                        清除所有记录
                    </button>
                </div>
            )}
        </div>
    </div>
  );
};
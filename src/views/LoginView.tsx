import React, { useState } from 'react';
import { Car, User, Lock, Mail, ArrowRight, Loader2 } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (username: string) => void;
}

// 核心修复: 模拟一个内存数据库
const MOCK_USER_DB: Record<string, string> = {
    'admin': '123456' // 这是一个内置的默认账号
};

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Form State
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // 基础非空验证
    if (!username || !password) {
        setError("请输入用户名和密码");
        setIsLoading(false);
        return;
    }

    if (isRegistering) {
        // --- 注册流程 ---
        if (!email) {
            setError("请输入邮箱");
            setIsLoading(false);
            return;
        }
        if (password !== confirmPassword) {
            setError("两次输入的密码不一致");
            setIsLoading(false);
            return;
        }
        
        // 模拟向后端发送注册请求
        setTimeout(() => {
            MOCK_USER_DB[username] = password;

            console.log("注册成功，用户数据已保存:", { username });
            setIsLoading(false);
            setIsRegistering(false); // 切换回登录页
            alert("注册成功！请使用刚才设置的密码登录。");
            
            setPassword('');
            setConfirmPassword('');
        }, 1000);

    } else {
        // --- 登录流程 ---
        setTimeout(() => {
            const storedPassword = MOCK_USER_DB[username];

            // 校验密码
            if (storedPassword && storedPassword === password) { 
                console.log("登录成功");
                onLoginSuccess(username);
            } else {
                setError("用户名或密码错误");
                setIsLoading(false);
            }
        }, 800);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center relative overflow-hidden font-sans">
      {/* 动态背景层 */}
      <div className="absolute inset-0 z-0 pointer-events-none">
         {/* 修复：调整渐变透明度，让背景图能透出来。via-slate-900/90 稍微透明一点 */}
         <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-blue-900/40 z-10"></div>
         {/* 装饰性背景图 */}
         <div className="absolute top-0 left-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-20"></div>
      </div>

      {/* 主卡片容器 */}
      <div className="z-20 w-full max-w-4xl h-[600px] bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden flex border border-slate-700/50 transition-all duration-300 hover:shadow-blue-900/20">
          
          {/* 左侧：品牌展示区 */}
          <div className="hidden md:flex w-1/2 bg-gradient-to-br from-blue-900/40 to-slate-900/40 flex-col items-center justify-center p-12 text-center relative overflow-hidden">
              <div className="relative z-10">
                  <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-blue-500/20 transform -rotate-6 transition-transform hover:rotate-0 duration-500 group cursor-pointer">
                    <Car size={48} className="text-white group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-4 tracking-wide">CloudDrive <span className="text-blue-400">Pilot</span></h2>
                  <p className="text-slate-300 leading-relaxed font-light">
                    下一代 5G 远程驾驶云控平台<br/>
                    <span className="text-xs text-slate-400 mt-2 block font-medium tracking-wider opacity-70">Next-Gen 5G Remote Driving Platform</span>
                  </p>
              </div>
              
              {/* 装饰光晕 */}
              <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-600/20 rounded-full blur-3xl animate-pulse delay-700"></div>
          </div>

          {/* 右侧：表单区域 */}
          <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-slate-800/40 relative">
              <div className="mb-8">
                  <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">
                      {isRegistering ? '创建账户' : '欢迎回来'}
                  </h3>
                  <p className="text-slate-400 text-sm">
                      {isRegistering ? '加入智能驾驶网络' : '请输入凭证进入驾驶舱'}
                  </p>
              </div>

              {/* 错误提示框 */}
              {error && (
                  <div className="mb-6 p-3 bg-red-500/10 border-l-4 border-red-500 text-red-200 text-xs rounded-r flex items-center gap-2 animate-[slideUp_0.3s_ease-out]">
                      <span>⚠️</span> {error}
                  </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="group">
                      <div className="relative">
                          <User size={18} className="absolute left-3 top-3.5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                          <input 
                              type="text" 
                              value={username}
                              onChange={(e) => setUsername(e.target.value)}
                              className="w-full bg-slate-900/60 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                              placeholder="请输入用户名" 
                          />
                      </div>
                  </div>

                  {isRegistering && (
                    <div className="group animate-[slideUp_0.4s_ease-out]">
                        <div className="relative">
                            <Mail size={18} className="absolute left-3 top-3.5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-slate-900/60 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                placeholder="请输入邮箱"
                            />
                        </div>
                    </div>
                  )}

                  <div className="group">
                      <div className="relative">
                          <Lock size={18} className="absolute left-3 top-3.5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                          <input 
                              type="password" 
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="w-full bg-slate-900/60 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                              placeholder="请输入密码"
                          />
                      </div>
                  </div>

                  {isRegistering && (
                    <div className="group animate-[slideUp_0.4s_ease-out]">
                        <div className="relative">
                            <Lock size={18} className="absolute left-3 top-3.5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                            <input 
                                type="password" 
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full bg-slate-900/60 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                placeholder="请再次输入密码"
                            />
                        </div>
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-3 rounded-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 mt-4 shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-blue-500/40"
                  >
                      {isLoading ? (
                          <Loader2 className="animate-spin" size={20} />
                      ) : (
                          <>
                            {isRegistering ? '立即注册' : '登录系统'}
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                          </>
                      )}
                  </button>
              </form>

              <div className="mt-8 text-center">
                  <p className="text-slate-400 text-sm">
                      {isRegistering ? "已有账户？" : "还没有账户？"}
                      <button 
                        onClick={() => {
                            setIsRegistering(!isRegistering);
                            setError(null);
                            setPassword('');
                            setConfirmPassword('');
                        }}
                        className="ml-2 text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-4 decoration-blue-400/30 hover:decoration-blue-400 transition-all"
                      >
                          {isRegistering ? '去登录' : '去注册'}
                      </button>
                  </p>
              </div>
          </div>
      </div>
      
      {/* 底部版权信息 */}
      <div className="absolute bottom-4 text-center text-slate-600 text-xs w-full">
         &copy; 2024 中汽创智科技有限公司 (CAIC). All Rights Reserved.
      </div>
    </div>
  );
};
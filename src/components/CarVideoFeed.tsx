import React, { useState } from 'react';

interface CarVideoFeedProps {
  label?: string;
  src?: string;
  isActive?: boolean;
  className?: string;
  autoConnect?: boolean;
}

export const CarVideoFeed: React.FC<CarVideoFeedProps> = ({
  label = '小车视频',
  src,
  isActive = true,
  className = '',
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const defaultSrc = 'http://localhost:8001/';
  const streamUrl = src || defaultSrc;

  const handleImageLoad = () => {
    console.log('✅ 视频流加载成功');
    setIsLoading(false);
    setHasError(false);
  };

  const handleImageError = () => {
    console.error('❌ 视频流加载失败:', streamUrl);
    setIsLoading(false);
    setHasError(true);
    const timer = setTimeout(() => {
      setRetryCount(c => c + 1);
    }, 3000);
    return () => clearTimeout(timer);
  };

  const handleReconnect = () => {
    setHasError(false);
    setIsLoading(true);
    setRetryCount(c => c + 1);
  };

  return (
    <div className={`relative bg-black overflow-hidden border border-gray-800 flex flex-col ${className}`}>
      <div className="absolute top-2 left-2 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded border border-white/10">
        <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] ${
          isActive && !hasError 
            ? 'bg-green-500 animate-pulse text-green-500' 
            : 'bg-red-500 text-red-500'
        }`} />
        <span className="text-[10px] text-white font-mono tracking-wider opacity-80">
          {label}
        </span>
      </div>

      <div className="flex-1 w-full h-full relative">
        {isActive ? (
          <>
            <img
              key={retryCount}
              src={streamUrl}
              alt={label}
              onLoad={handleImageLoad}
              onError={handleImageError}
              className={`w-full h-full object-cover bg-gray-900 ${
                hasError ? 'opacity-50' : 'opacity-100'
              }`}
              style={{ transform: 'scale(1.01)' }}
              crossOrigin="anonymous"
            />
            
            {hasError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10">
                <div className="text-red-500 text-sm font-mono mb-2">
                  ⚠️ 视频流连接失败
                </div>
                <button
                  onClick={handleReconnect}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-mono rounded border border-red-400"
                >
                  重新连接
                </button>
                <div className="text-gray-500 text-[10px] font-mono mt-3 text-center">
                  请检查：<br/>
                  1. 小车程序是否运行<br/>
                  2. 视频代理是否启动<br/>
                  3. 网络是否连通
                </div>
              </div>
            )}

            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-10 pointer-events-none">
                <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                <span className="text-blue-400 text-xs font-mono">
                  视频流连接中...
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 bg-[#0a0a0a]">
            <div className="w-12 h-12 border-2 border-gray-700 border-t-transparent rounded-full animate-spin mb-4 opacity-50"></div>
            <span className="text-xs font-mono">信号丢失...</span>
          </div>
        )}
      </div>

      <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
    </div>
  );
};

import React, { useEffect, useRef, useState } from 'react';

interface VideoFeedProps {
  label: string;
  // 模拟源 (仅用于演示，开发真实功能时可忽略)
  src?: string; 
  /**
   * [填空区 2]: WebRTC 媒体流对象
   * 在真实开发中，您的 WebRTC 客户端(如浏览器原生API)会产生一个 MediaStream 对象
   * 将该对象传给此 stream 属性即可
   */
  stream?: MediaStream; 
  isActive?: boolean;
  overlay?: React.ReactNode;
  className?: string;
  fit?: 'cover' | 'contain' | 'fill';
}

/**
 * 视频流组件 - 真实开发实施指南 (IMPLEMENTATION GUIDE)
 * 
 * ============================================================================
 * 第一步：车端推流 (Car Side / Sender)
 * ============================================================================
 * 您需要在车端工控机 (如 Jetson Orin/Xavier 或 树莓派) 上运行推流程序。
 * 
 * 方案 A: 使用 GStreamer (推荐，延迟最低 <200ms)
 * --------------------------------------------------------
 * 请在车端终端运行以下命令 (假设使用 USB 摄像头 /dev/video0):
 * 
 * gst-launch-1.0 v4l2src device=/dev/video0 ! \
 *   'video/x-raw,width=1280,height=720,framerate=30/1' ! \
 *   videoconvert ! \
 *   x264enc tune=zerolatency bitrate=2000 speed-preset=ultrafast ! \
 *   rtph264pay ! \
 *   udpsink host=[云端IP] port=5000
 * 
 * 
 * 方案 B: 使用 FFmpeg (通用性好，但延迟稍高)
 * --------------------------------------------------------
 * ffmpeg -f v4l2 -i /dev/video0 \
 *   -c:v libx264 -preset ultrafast -tune zerolatency \
 *   -f rtp rtp://[云端IP]:5000
 * 
 * ============================================================================
 * 第二步：云端转发 (Cloud Server)
 * ============================================================================
 * 您需要部署一个 WebRTC 流媒体服务器来接收车端的 RTP 流，并转为 WebRTC 供前端播放。
 * 推荐开源项目：
 * 1. SRS (Simple Realtime Server): https://github.com/ossrs/srs
 *    - 支持将 RTMP/RTP 转为 WebRTC。
 * 2. Janus Gateway: https://github.com/meetecho/janus-gateway
 * 
 * ============================================================================
 * 第三步：前端接入 (Front-End)
 * ============================================================================
 * 在 services/vehicleConnection.ts 或组件中：
 * 
 * 1. 创建 RTCPeerConnection:
 *    const pc = new RTCPeerConnection(config);
 * 
 * 2. 连接云端信令服务器交换 SDP:
 *    // ... 信令交换代码 ...
 * 
 * 3. 获取流并传递给本组件:
 *    pc.ontrack = (event) => {
 *       const remoteStream = event.streams[0];
 *       // 将此 remoteStream 传递给 <VideoFeed stream={remoteStream} />
 *    };
 * ============================================================================
 */

export const VideoFeed: React.FC<VideoFeedProps> = ({ 
  label, 
  src, 
  stream, 
  isActive = true, 
  overlay, 
  className, 
  fit = 'cover' 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasError, setHasError] = useState(false);

  // [填空区 3]: 这里处理真实的 WebRTC 流
  useEffect(() => {
    if (videoRef.current && stream) {
      // 将 MediaStream 直接赋值给 video 标签
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(e => console.error("Auto-play failed:", e));
      setHasError(false); // 重置错误状态
    }
  }, [stream]);

  return (
    <div className={`relative bg-black overflow-hidden border border-gray-800 flex flex-col ${className}`}>
      
      {/* 信号状态指示 */}
      <div className="absolute top-2 left-2 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded border border-white/10">
        <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] ${isActive && !hasError ? 'bg-green-500 animate-pulse text-green-500' : 'bg-red-500 text-red-500'}`} />
        <span className="text-[10px] text-white font-mono tracking-wider opacity-80">{label}</span>
      </div>

      <div className="flex-1 w-full h-full relative">
        {isActive ? (
          <video 
            ref={videoRef}
            // 如果有真实流(stream)则用流，否则用src(模拟视频)
            src={!stream ? src : undefined} 
            autoPlay 
            muted 
            loop 
            playsInline
            onError={() => setHasError(true)}
            className={`w-full h-full object-${fit} bg-gray-900`}
            style={{ transform: 'scale(1.01)' }} 
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 bg-[#0a0a0a]">
             <div className="w-12 h-12 border-2 border-gray-700 border-t-transparent rounded-full animate-spin mb-4 opacity-50"></div>
             <span className="text-xs font-mono">信号丢失...</span>
          </div>
        )}
        
        {hasError && isActive && (
             <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
                 <span className="text-red-500 text-xs font-mono">无视频信号</span>
             </div>
        )}
      </div>

      {overlay && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {overlay}
        </div>
      )}

      {/* 装饰网格 */}
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
    </div>
  );
};
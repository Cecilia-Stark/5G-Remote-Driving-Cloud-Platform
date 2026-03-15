import React, { useEffect, useRef, useState } from 'react';
import { Navigation, Locate, Layers, Compass } from 'lucide-react';

interface MapContainerProps {
  lat: number;
  lng: number;
  className?: string;
}

// 声明 BMapGL 类型 (使用 WebGL 版本)
declare global {
  interface Window {
    BMapGL: any;
  }
}

/**
 * 3D 实时导航地图组件 (Powered by Baidu Map GL)
 * 
 * 修改说明：
 * 1. 移除了右上角的 GPS 信息悬浮窗，解决遮挡问题。
 * 2. 保留了核心的 3D 控制功能 (旋转、回正)。
 */
export const MapContainer: React.FC<MapContainerProps> = ({ lat, lng, className }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);    // 保存地图实例
  const markerInstance = useRef<any>(null); // 保存车标实例
  const [error, setError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState<boolean>(true); // 是否锁定跟随车辆
  const [heading, setHeading] = useState<number>(0); // 地图旋转角度

  // 初始化地图
  useEffect(() => {
    if (!mapRef.current) return;

    if (typeof window.BMapGL === 'undefined') {
      setError("百度地图 GL API 未加载。");
      return;
    }

    const initTimer = setTimeout(() => {
        try {
            const BMapGL = window.BMapGL;
            const map = new BMapGL.Map(mapRef.current);
            const point = new BMapGL.Point(lng, lat);
            
            // 1. 基础配置
            map.centerAndZoom(point, 19); 
            map.enableScrollWheelZoom(true); 
            
            map.setDisplayOptions && map.setDisplayOptions({
                skyColors: ['rgba(5, 5, 20, 1)', 'rgba(10, 20, 50, 1)']
            });

            // 2. 设置 3D 视角
            map.setTilt(60);   
            map.setHeading(0); 

            // 3. 添加控件 (仅保留右下角缩放)
            const zoomCtrl = new BMapGL.ZoomControl({ anchor: 2, offset: new BMapGL.Size(10, 50) }); 
            map.addControl(zoomCtrl);

            // 4. 添加车辆标记
            const marker = new BMapGL.Marker(point);
            map.addOverlay(marker);
            
            // 简单的文字标注 (只保留“我车位置”，且样式更精简)
            const label = new BMapGL.Label("我车位置", { 
                position: point,
                offset: new BMapGL.Size(15, -30) 
            });
            label.setStyle({
                color : "#fff",
                fontSize : "12px",
                fontWeight: "bold",
                backgroundColor: "rgba(37, 99, 235, 0.9)",
                border: "none",
                borderRadius: "4px",
                padding: "4px 8px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.5)"
            });
            map.addOverlay(label);
            
            // 5. 事件监听
            map.addEventListener('dragstart', () => {
                if (isFollowing) setIsFollowing(false);
            });

            map.setMapType(window.BMapGL.BMAP_NORMAL_MAP); 

            mapInstance.current = map;
            markerInstance.current = marker;
            setError(null);

        } catch (e) {
            console.error("Map Init Error:", e);
            setError("地图初始化异常");
        }
    }, 300); 
    
    return () => {
       clearTimeout(initTimer);
       if (mapInstance.current) {
           mapInstance.current.destroy();
       }
    };
  }, []); 

  // 监听坐标变化
  useEffect(() => {
    if (mapInstance.current && markerInstance.current && window.BMapGL) {
      const BMapGL = window.BMapGL;
      const newPoint = new BMapGL.Point(lng, lat);
      markerInstance.current.setPosition(newPoint);
      if (isFollowing) {
        mapInstance.current.panTo(newPoint);
      }
    }
  }, [lat, lng, isFollowing]);

  const handleRecenter = () => {
      if (mapInstance.current && window.BMapGL) {
          const BMapGL = window.BMapGL;
          const point = new BMapGL.Point(lng, lat);
          mapInstance.current.flyTo(point, 19); 
          setTimeout(() => {
              mapInstance.current.setTilt(60);
              mapInstance.current.setHeading(0);
          }, 1000); 
          setIsFollowing(true);
          setHeading(0);
      }
  };

  const rotateMap = () => {
      if (mapInstance.current) {
          const newHeading = (heading + 90) % 360;
          mapInstance.current.setHeading(newHeading);
          setHeading(newHeading);
          setIsFollowing(false); 
      }
  };

  return (
    <div className={`relative bg-[#050514] overflow-hidden flex flex-col ${className}`}>
        {/* 地图容器 */}
        <div 
          ref={mapRef}
          className="flex-1 w-full h-full min-h-[300px]"
          id="baidu-map-container"
          style={{ backgroundColor: '#050514' }} 
        >
        </div>

        {/* 错误提示 */}
        {error && (
            <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center text-center p-6 z-20">
                <Navigation size={48} className="text-red-500 mb-4" />
                <p className="text-gray-400 text-sm">{error}</p>
            </div>
        )}

        {!error && (
            <>
                {/* 底部 3D 功能指示 */}
                <div className="absolute bottom-3 left-3 flex gap-2 z-10 pointer-events-none">
                    <span className="bg-black/60 px-2 py-1 rounded text-[10px] text-gray-300 border border-white/10 flex items-center gap-2 backdrop-blur-sm">
                        <Layers size={12} /> 
                        <span>3D 模型已启用</span>
                    </span>
                </div>

                {/* 控制按钮组 (仅保留旋转和回正，且位置下移以免遮挡) */}
                <div className="absolute bottom-8 right-3 flex flex-col gap-2 z-20">
                     <button 
                        onClick={rotateMap}
                        className="bg-slate-800/90 hover:bg-slate-700 text-white w-10 h-10 rounded-full shadow-lg border border-slate-600 flex items-center justify-center transition-all"
                        title="旋转视角"
                    >
                        <Compass size={20} style={{ transform: `rotate(${heading}deg)`, transition: 'transform 0.5s' }} />
                    </button>

                    {!isFollowing && (
                        <button 
                            onClick={handleRecenter}
                            className="bg-blue-600/90 hover:bg-blue-500 text-white w-10 h-10 rounded-full shadow-lg border border-blue-400 flex items-center justify-center transition-all animate-bounce"
                            title="回正视角"
                        >
                            <Locate size={20} />
                        </button>
                    )}
                </div>
            </>
        )}
    </div>
  );
};
import React, { useEffect, useRef } from 'react';
import { ShieldAlert } from 'lucide-react';

// OpenLayers Web Mercator Projection Math
const R = 6378137;
const EE = R * Math.PI;
function mercator([lon, lat]) {
  const x = lon / 180 * EE;
  let y = R * Math.log(Math.tan(Math.PI * (lat + 90) / 360));
  if (!isFinite(y)) y = (lat >= 0 ? 1 : -1) * EE;
  return [x, Math.max(Math.min(y, EE), -EE)];
}

export default function LandslideCommandMap({
  zones = [],
  infrastructure = [],
  sensorNodes = [],
  citizenReports = [],
  selectedTarget = null,
  onTriggerAlert = () => {}
}) {
  const iframeRef = useRef(null);
  const containerRef = useRef(null);
  const rafRef = useRef(null);

  // New Delhi verification coordinate
  const DELHI = [77.2090, 28.6139];

  useEffect(() => {
    // 60fps Application-Level Bridge to the Zoom Earth Map Engine
    const updateMarkers = () => {
      if (iframeRef.current && containerRef.current) {
        try {
          const cw = iframeRef.current.contentWindow;
          const controller = cw.__zeController;
          
          if (controller && controller.map && controller.map.frameState) {
            const map = controller.map;
            
            // Sync all custom marker positions directly via DOM manipulation
            // We use translate3d so React doesn't need to re-render, giving native 60fps performance
            const markers = containerRef.current.querySelectorAll('.ze-marker');
            markers.forEach(marker => {
              const lon = parseFloat(marker.dataset.lon);
              const lat = parseFloat(marker.dataset.lat);
              if (!isNaN(lon) && !isNaN(lat)) {
                // Project real coordinate to viewport pixel via OpenLayers engine
                const px = map.getPixelFromCoordinate(mercator([lon, lat]));
                if (px) {
                  marker.style.display = 'block';
                  // Center the element over the pixel coordinate
                  marker.style.transform = `translate3d(${px[0] - 10}px, ${px[1] - 10}px, 0)`;
                } else {
                  marker.style.display = 'none';
                }
              }
            });
          }
        } catch (e) {
          // Ignore cross-origin access errors before iframe fully loads
        }
      }
      rafRef.current = requestAnimationFrame(updateMarkers);
    };

    rafRef.current = requestAnimationFrame(updateMarkers);
    
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="relative h-full w-full bg-[#111111] overflow-hidden" ref={containerRef}>
      {/* Zoom Earth Core Engine */}
      <iframe
        ref={iframeRef}
        src="/zoom_earth/index.html"
        className="w-full h-full border-0 absolute top-0 left-0"
        title="Zoom Earth Map Engine"
      />
      
      {/* Geographically Locked New Delhi Marker */}
      <div 
        className="ze-marker absolute w-5 h-5 bg-red-600 border-[3px] border-white rounded-full pointer-events-none shadow-[0_0_15px_rgba(220,38,38,0.9)] z-50 transition-none hidden"
        data-lon={DELHI[0]}
        data-lat={DELHI[1]}
      >
        <div className="absolute inset-0 rounded-full animate-ping bg-red-400 opacity-75"></div>
      </div>

      {/* Dynamic Sensor Nodes Overlay (Application Level) */}
      {sensorNodes.map((node) => (
        <div 
          key={node.node_id || node.node_code}
          className="ze-marker absolute w-4 h-4 bg-amber-500 border-2 border-white rounded-full pointer-events-auto shadow-lg z-40 transition-none hidden hover:scale-125 cursor-pointer"
          data-lon={node.lon || 91.88}
          data-lat={node.lat || 25.75}
          title={node.node_name || node.node_code}
        />
      ))}

      {/* Map Legend Overlay */}
      <div className="absolute bottom-6 left-6 z-[1000] bg-black/60 backdrop-blur-xl p-3.5 rounded-2xl border border-white/10 shadow-2xl text-xs space-y-2 max-w-[220px] pointer-events-none">
        <div className="font-bold text-slate-200 uppercase tracking-widest text-[10px] flex items-center justify-between drop-shadow-sm">
          <span>Command Map Layer</span>
          <ShieldAlert size={14} className="text-indigo-400" />
        </div>
        <div className="space-y-2 text-[11px] pt-1">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-red-600 shadow-[0_0_8px_#ef4444] border-2 border-white"></span>
            <span className="text-slate-200 font-medium drop-shadow-sm">Test Target (Delhi)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-white"></span>
            <span className="text-slate-200 font-medium drop-shadow-sm">Sensor Node</span>
          </div>
          <div className="text-[9px] text-slate-400 text-center uppercase font-bold tracking-widest mt-2 border-t border-white/10 pt-2">
            Zoom Earth HD Satellite Engine
          </div>
        </div>
      </div>
    </div>
  );
}

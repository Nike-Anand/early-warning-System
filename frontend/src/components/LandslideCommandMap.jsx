import React, { useEffect, useRef, useState } from 'react';
import { ShieldAlert, Camera, Wifi } from 'lucide-react';

// Landslide-Specific Map Legend
function MapLegend() {
  const [open, setOpen] = useState(false);
  return (
    <div className="absolute bottom-16 left-6 z-[1000] pointer-events-auto">
      {/* Toggle chip */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center space-x-2 bg-black/80 hover:bg-black/95 backdrop-blur-xl px-3.5 py-2 rounded-2xl border border-white/10 shadow-2xl transition-all"
      >
        <ShieldAlert size={14} className="text-indigo-400 flex-shrink-0" />
        <span className="text-[10px] font-bold text-slate-200 uppercase tracking-widest">Landslide Risk Legend</span>
        <span className="text-slate-400 text-[10px]">{open ? '▲' : '▼'}</span>
      </button>

      {/* Expandable panel — pops upward */}
      {open && (
        <div className="absolute bottom-full mb-2 left-0 bg-slate-950/90 backdrop-blur-2xl p-4 rounded-3xl border border-white/10 shadow-2xl text-xs space-y-3 w-[260px]">
          <div className="font-extrabold text-slate-200 uppercase tracking-widest text-[10px] flex items-center justify-between pb-1 border-b border-white/10">
            <span>Geotechnical Hazard Matrix</span>
            <ShieldAlert size={14} className="text-indigo-400" />
          </div>

          {/* FoS Hazard Classification */}
          <div className="space-y-1.5">
            <span className="text-[9px] font-mono text-slate-400 uppercase font-bold tracking-wider">Factor of Safety (FoS) Tiers</span>
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              <div className="flex items-center space-x-1.5 bg-rose-500/10 p-1.5 rounded-lg border border-rose-500/30">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_6px_#ef4444]"></span>
                <span className="text-rose-300 font-bold">FoS &lt; 1.0 (Critical)</span>
              </div>
              <div className="flex items-center space-x-1.5 bg-amber-500/10 p-1.5 rounded-lg border border-amber-500/30">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span className="text-amber-300 font-bold">1.0-1.25 (High)</span>
              </div>
              <div className="flex items-center space-x-1.5 bg-yellow-500/10 p-1.5 rounded-lg border border-yellow-500/30">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
                <span className="text-yellow-300 font-bold">1.25-1.5 (Medium)</span>
              </div>
              <div className="flex items-center space-x-1.5 bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/30">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="text-emerald-300 font-bold">&ge; 1.5 (Stable)</span>
              </div>
            </div>
          </div>

          {/* Slope Gradients & Saturation */}
          <div className="space-y-1.5 pt-1 border-t border-white/5 text-[10px]">
            <span className="text-[9px] font-mono text-slate-400 uppercase font-bold tracking-wider">Slope & Saturation Indicators</span>
            <div className="space-y-1 text-slate-300">
              <div className="flex items-center justify-between">
                <span>Steep Slope (&gt; 45&deg;)</span>
                <span className="font-mono text-rose-400 font-bold">HIGH SHEAR</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Soil Saturation &gt; 85%</span>
                <span className="font-mono text-cyan-400 font-bold">LIQUEFACTION</span>
              </div>
            </div>
          </div>

          {/* Marker Symbols */}
          <div className="space-y-1.5 pt-1 border-t border-white/5 text-[10px]">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-amber-500 border border-white/50 flex items-center justify-center flex-shrink-0"><Wifi size={8} className="text-white"/></span>
              <span className="text-slate-200 font-medium">IoT Slope Telemetry Node</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-indigo-500 border border-white/50 flex items-center justify-center flex-shrink-0"><Camera size={8} className="text-white"/></span>
              <span className="text-slate-200 font-medium">Crowdsourced Incident Report</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-1.5 bg-rose-500 border-b border-rose-300"></div>
              <span className="text-slate-200 font-medium">Blocked Highway Corridor</span>
            </div>
          </div>

          <div className="text-[9px] text-slate-400 text-center uppercase font-bold tracking-widest pt-2 border-t border-white/10">
            PostGIS SRID 4326 Precision Layer
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-Meter Geodesic Distance & Point Accuracy Tool
function DistanceAccuracyTool() {
  const [active, setActive] = useState(false);
  const [pt1, setPt1] = useState('25.710, 91.820');
  const [pt2, setPt2] = useState('25.580, 91.890');
  const [result, setResult] = useState(null);

  const calculateDistance = async () => {
    try {
      const [lat1, lon1] = pt1.split(',').map(n => parseFloat(n.trim()));
      const [lat2, lon2] = pt2.split(',').map(n => parseFloat(n.trim()));
      const res = await fetch(`/api/v1/infrastructure/distance?lat1=${lat1}&lon1=${lon1}&lat2=${lat2}&lon2=${lon2}`);
      if (res.ok) {
        const json = await res.json();
        setResult(json);
      }
    } catch (e) {
      console.warn("Distance calculation fallback:", e);
    }
  };

  return (
    <div className="absolute top-20 right-6 z-[1000] pointer-events-auto">
      <button
        onClick={() => setActive(!active)}
        className="px-3 py-1.5 bg-black/80 hover:bg-black/95 text-slate-200 backdrop-blur-xl border border-white/10 rounded-2xl text-xs font-bold shadow-2xl flex items-center space-x-1.5 transition-all"
      >
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
        <span>Point Accuracy & Distance</span>
      </button>

      {active && (
        <div className="absolute top-full mt-2 right-0 bg-slate-950/90 backdrop-blur-2xl p-4 rounded-3xl border border-white/10 shadow-2xl text-xs space-y-3 w-[280px]">
          <div className="font-extrabold text-slate-200 uppercase tracking-widest text-[10px] flex items-center justify-between border-b border-white/10 pb-1">
            <span>Geodesic Distance & Accuracy</span>
            <span className="text-cyan-400 font-mono">WGS84</span>
          </div>

          <div className="space-y-2">
            <div>
              <label className="text-[9px] text-slate-400 font-mono uppercase font-bold block mb-1">Point A Coordinates (Lat, Lon)</label>
              <input
                type="text"
                value={pt1}
                onChange={(e) => setPt1(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="text-[9px] text-slate-400 font-mono uppercase font-bold block mb-1">Point B Coordinates (Lat, Lon)</label>
              <input
                type="text"
                value={pt2}
                onChange={(e) => setPt2(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>
          </div>

          <button
            onClick={calculateDistance}
            className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-cyan-600/30 transition-all"
          >
            Compute Sub-Meter Distance
          </button>

          {result && (
            <div className="p-3 bg-white/5 rounded-2xl space-y-1 text-[11px] border border-white/5">
              <div className="flex justify-between">
                <span className="text-slate-400">Geodesic Distance:</span>
                <span className="text-cyan-300 font-mono font-bold">{result.distance_km} km ({result.distance_meters} m)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Spatial Accuracy:</span>
                <span className="text-emerald-400 font-mono font-bold text-[9px]">{result.spatial_accuracy_rating}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Est. Transit Time:</span>
                <span className="text-amber-300 font-mono font-bold">{result.estimated_emergency_transit_mins} mins</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// OpenLayers Web Mercator Projection Math
const R = 6378137;
const EE = R * Math.PI;
function mercator([lon, lat]) {
  const x = lon / 180 * EE;
  let y = R * Math.log(Math.tan(Math.PI * (lat + 90) / 360));
  if (!isFinite(y)) y = (lat >= 0 ? 1 : -1) * EE;
  return [x, Math.max(Math.min(y, EE), -EE)];
}

const getRiskColor = (status, alpha = 1.0) => {
  switch (status) {
    case 'CRITICAL': return `rgba(239, 68, 68, ${alpha})`; // EF4444
    case 'HIGH': return `rgba(249, 115, 22, ${alpha})`; // F97316
    case 'MEDIUM': return `rgba(234, 179, 8, ${alpha})`; // EAB308
    default: return `rgba(34, 197, 94, ${alpha})`; // 22C55E
  }
};

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
  const debugLogged = useRef(false);

  // Handle Map Panning
  useEffect(() => {
    if (selectedTarget && iframeRef.current) {
      try {
        const cw = iframeRef.current.contentWindow;
        if (cw && cw.__zeController && cw.__zeController.map) {
          const map = cw.__zeController.map;
          if (map.getView) {
            const view = map.getView();
            view.animate({
              center: mercator([selectedTarget.lng, selectedTarget.lat]),
              zoom: selectedTarget.zoom || 11,
              duration: 1200
            });
          }
        }
      } catch (e) {
        // Ignore cross-origin error
      }
    }
  }, [selectedTarget]);

  useEffect(() => {
    // 60fps Application-Level Bridge to the Zoom Earth Map Engine
    const updateMarkers = () => {
      if (iframeRef.current && containerRef.current) {
        try {
          const cw = iframeRef.current.contentWindow;
          const controller = cw.__zeController;
          
          if (!debugLogged.current && controller && controller.map) {
            console.log("🟢 [LandslideCommandMap] Successfully bridged with Zoom Earth __zeController!");
            debugLogged.current = true;
          }
          
          if (controller && controller.map && controller.map.frameState) {
            const map = controller.map;
            
            // 1. Sync all HTML markers (Nodes, Reports, Test points)
            const markers = containerRef.current.querySelectorAll('.ze-marker');
            markers.forEach(marker => {
              const lon = parseFloat(marker.dataset.lon);
              const lat = parseFloat(marker.dataset.lat);
              if (!isNaN(lon) && !isNaN(lat)) {
                const px = map.getPixelFromCoordinate(mercator([lon, lat]));
                if (px) {
                  marker.style.display = 'flex';
                  // Center the element
                  marker.style.transform = `translate3d(${px[0]}px, ${px[1]}px, 0) translate(-50%, -50%)`;
                } else {
                  marker.style.display = 'none';
                }
              }
            });

            // 2. Sync all SVG Geometries (Zones, Infrastructure)
            const paths = containerRef.current.querySelectorAll('.ze-polygon');
            paths.forEach(path => {
              const type = path.dataset.type;
              if (!path._parsedCoords && path.dataset.coords) {
                path._parsedCoords = JSON.parse(path.dataset.coords);
              }
              const coords = path._parsedCoords;
              if (!coords) return;
              
              if (type === 'Polygon' || type === 'MultiPolygon') {
                let d = '';
                // Flatten MultiPolygon to array of rings, Polygon is already array of rings
                const rings = type === 'MultiPolygon' ? coords.flat(1) : coords; 
                
                rings.forEach(ring => {
                  ring.forEach((pt, idx) => {
                    const px = map.getPixelFromCoordinate(mercator(pt));
                    if (px) {
                      d += (idx === 0 ? 'M' : 'L') + px[0] + ',' + px[1] + ' ';
                    }
                  });
                  d += 'Z ';
                });
                path.setAttribute('d', d.trim());
              } else if (type === 'LineString') {
                let d = '';
                coords.forEach((pt, idx) => {
                  const px = map.getPixelFromCoordinate(mercator(pt));
                  if (px) {
                    d += (idx === 0 ? 'M' : 'L') + px[0] + ',' + px[1] + ' ';
                  }
                });
                path.setAttribute('d', d.trim());
              }
            });
          }
        } catch (e) {
          if (!debugLogged.current) {
             console.error("🔴 [LandslideCommandMap] Iframe bridge error:", e);
             debugLogged.current = true; // Log once
          }
        }
      }
      rafRef.current = requestAnimationFrame(updateMarkers);
    };

    rafRef.current = requestAnimationFrame(updateMarkers);
    
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Determine if backend is currently unavailable / empty
  const isDataEmpty = zones.length === 0 && sensorNodes.length === 0 && citizenReports.length === 0;

  return (
    <div className="relative h-full w-full bg-[#111111] overflow-hidden" ref={containerRef}>
      {/* Zoom Earth Core Engine */}
      <iframe
        ref={iframeRef}
        id="ze-iframe"
        sandbox="allow-scripts allow-same-origin"
        src="/zoom_earth/index.html"
        className="w-full h-full border-0 absolute top-0 left-0"
        title="Zoom Earth Map Engine"
      />
      
      {/* Offline / Empty State Banner */}
      {isDataEmpty && (
        <div className="absolute top-[80px] left-1/2 transform -translate-x-1/2 z-[1000] bg-black/60 backdrop-blur-xl px-4 py-2 rounded-full border border-rose-500/30 text-xs font-semibold text-rose-200 shadow-[0_0_15px_rgba(225,29,72,0.3)] pointer-events-none flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
          <span>Awaiting live telemetry (Backend offline)</span>
        </div>
      )}

      {/* Geographically Locked SVG Layer (Polygons & Lines) */}
      <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-30" style={{ overflow: 'visible' }}>
        {zones.map((zone, i) => (
          <path 
            key={`zone-${zone.properties?.zone_id || i}`}
            className="ze-polygon pointer-events-auto cursor-pointer transition-opacity"
            data-coords={JSON.stringify(zone.geometry?.coordinates || [])}
            data-type={zone.geometry?.type}
            fill={getRiskColor(zone.properties?.current_risk_status, 0.45)}
            stroke={getRiskColor(zone.properties?.current_risk_status, 1.0)}
            strokeWidth="2"
            onMouseEnter={(e) => e.target.style.stroke = '#fff'}
            onMouseLeave={(e) => e.target.style.stroke = getRiskColor(zone.properties?.current_risk_status, 1.0)}
            onClick={() => onTriggerAlert(zone.properties)}
          >
            <title>{zone.properties?.zone_name} - {zone.properties?.current_risk_status}</title>
          </path>
        ))}
        {infrastructure.map((infra, i) => (
          <path 
            key={`infra-${infra.properties?.element_id || i}`}
            className="ze-polygon pointer-events-auto transition-opacity"
            data-coords={JSON.stringify(infra.geometry?.coordinates || [])}
            data-type={infra.geometry?.type}
            fill="none"
            stroke={infra.properties?.current_status === 'blocked' ? '#ef4444' : '#3b82f6'}
            strokeWidth="3"
            strokeDasharray={infra.properties?.current_status === 'blocked' ? '6,6' : 'none'}
          >
            <title>{infra.properties?.name} ({infra.properties?.current_status})</title>
          </path>
        ))}
      </svg>

      {/* HTML Marker Layer */}
      {/* Geographically Locked New Delhi Marker */}
      <div 
        className="ze-marker absolute flex items-center justify-center w-5 h-5 bg-red-600 border-[3px] border-white rounded-full pointer-events-none shadow-[0_0_15px_rgba(220,38,38,0.9)] z-50 transition-none hidden"
        data-lon={77.2090}
        data-lat={28.6139}
        title="Verification Target: New Delhi"
      >
        <div className="absolute inset-0 rounded-full animate-ping bg-red-400 opacity-75"></div>
      </div>

      {/* Sensor Nodes Overlay */}
      {sensorNodes.map((node) => (
        <div 
          key={node.node_id || node.node_code}
          className="ze-marker absolute flex items-center justify-center w-6 h-6 bg-amber-500/90 border border-white/50 backdrop-blur-md rounded-full pointer-events-auto shadow-lg z-40 transition-none hidden hover:scale-125 hover:z-50 cursor-pointer"
          data-lon={node.lon || 91.88}
          data-lat={node.lat || 25.75}
          title={node.node_name || node.node_code}
        >
          <Wifi size={12} className="text-white" />
        </div>
      ))}

      {/* Citizen Reports Overlay */}
      {citizenReports.map((report) => (
        <div 
          key={report.report_id || report.id}
          className="ze-marker absolute flex items-center justify-center w-6 h-6 bg-indigo-500/90 border border-white/50 backdrop-blur-md rounded-full pointer-events-auto shadow-lg z-40 transition-none hidden hover:scale-125 hover:z-50 cursor-pointer"
          data-lon={report.lng || report.lon}
          data-lat={report.lat}
          title={report.hazard_type || 'Citizen Report'}
        >
          <Camera size={12} className="text-white" />
        </div>
      ))}

      {/* Map Legend Overlay — Collapsible */}
      <MapLegend />
      {/* Sub-meter Distance Accuracy Tool */}
      <DistanceAccuracyTool />
    </div>
  );
}

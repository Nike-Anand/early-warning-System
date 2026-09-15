import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ShieldAlert, Camera, Wifi } from 'lucide-react';

// Collapsible map legend — extracted as its own component to honour Rules of Hooks
function MapLegend({ t }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="absolute bottom-16 left-6 z-[1000] pointer-events-auto">

      {/* Toggle chip */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center space-x-2 bg-black/70 hover:bg-black/90 backdrop-blur-xl px-3 py-2 rounded-2xl border border-white/10 shadow-2xl transition-all"
      >
        <ShieldAlert
          size={14}
          className="text-indigo-400 flex-shrink-0"
        />

        <span className="text-[10px] font-bold text-slate-200 uppercase tracking-widest">
          {t('map_legend')}
        </span>

        <span className="text-slate-400 text-[10px]">
          {open ? '▲' : '▼'}
        </span>
      </button>

      {/* Expandable panel */}
{open && (
  <div className="absolute bottom-full mb-2 left-0 bg-black/85 backdrop-blur-xl p-3.5 rounded-2xl border border-white/10 shadow-2xl text-xs space-y-3 w-[250px] max-h-[70vh] overflow-y-auto">

    {/* Header */}
    <div className="font-bold text-slate-200 uppercase tracking-widest text-[10px] flex items-center justify-between">
      <span>{t('command_map_layer')}</span>
      <ShieldAlert size={13} className="text-indigo-400" />
    </div>

    {/* MONITORING */}
    <div>
      <div className="text-[9px] text-indigo-400 font-black uppercase tracking-widest mb-2">
        {t('monitoring')}
      </div>

      <div className="space-y-2">

        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-red-600 border-2 border-white flex-shrink-0"></span>
          <span className="text-slate-200 font-medium">
            {t('verification')} (Delhi)
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-amber-500 border border-white/50 flex items-center justify-center flex-shrink-0">
            <Wifi size={8} className="text-white" />
          </span>
          <span className="text-slate-200 font-medium">
            {t('iot_sensor_node')}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-indigo-500 border border-white/50 flex items-center justify-center flex-shrink-0">
            <Camera size={8} className="text-white" />
          </span>
          <span className="text-slate-200 font-medium">
            {t('citizen_report')}
          </span>
        </div>

      </div>
    </div>

    {/* LANDSLIDE RISK */}
    <div className="border-t border-white/10 pt-3">

      <div className="text-[9px] text-rose-400 font-black uppercase tracking-widest mb-2">
        {t('landslide_risk')}
      </div>

      <div className="space-y-2">

        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 bg-red-500/50 border border-red-500 flex-shrink-0"></span>
          <span className="text-slate-200 font-medium">
            {t('critical_zone')}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 bg-orange-500/50 border border-orange-500 flex-shrink-0"></span>
          <span className="text-slate-200 font-medium">
            {t('high_risk_zone')}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 bg-yellow-500/50 border border-yellow-500 flex-shrink-0"></span>
          <span className="text-slate-200 font-medium">
            {t('moderate_risk_zone')}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 bg-emerald-500/40 border border-emerald-500 flex-shrink-0"></span>
          <span className="text-slate-200 font-medium">
            {t('safe_zone')}
          </span>
        </div>

      </div>
    </div>

    {/* LANDSLIDE INDICATORS */}
    <div className="border-t border-white/10 pt-3">

      <div className="text-[9px] text-amber-400 font-black uppercase tracking-widest mb-2">
        {t('landslide_indicators')}
      </div>

      <div className="space-y-2">

        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-blue-500 border border-blue-300 flex-shrink-0"></span>
          <span className="text-slate-200 font-medium">
            {t('heavy_rainfall')}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-cyan-500 border border-cyan-300 flex-shrink-0"></span>
          <span className="text-slate-200 font-medium">
            {t('soil_moisture_alert')}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-purple-500 border border-purple-300 flex-shrink-0"></span>
          <span className="text-slate-200 font-medium">
            {t('high_slope')}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-fuchsia-500 border border-fuchsia-300 flex-shrink-0"></span>
          <span className="text-slate-200 font-medium">
            {t('ground_displacement')}
          </span>
        </div>

      </div>
    </div>

    {/* RESPONSE */}
    <div className="border-t border-white/10 pt-3">

      <div className="text-[9px] text-emerald-400 font-black uppercase tracking-widest mb-2">
        {t('response')}
      </div>

      <div className="space-y-2">

        <div className="flex items-center space-x-2">
          <span className="w-3 h-1 bg-red-500 flex-shrink-0"></span>
          <span className="text-slate-200 font-medium">
            {t('affected_road')}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="w-3 h-1 bg-blue-500 flex-shrink-0"></span>
          <span className="text-slate-200 font-medium">
            {t('evacuation_route')}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white flex-shrink-0"></span>
          <span className="text-slate-200 font-medium">
            {t('safe_evacuation_point')}
          </span>
        </div>

      </div>
    </div>

    {/* Satellite engine */}
    <div className="text-[9px] text-slate-400 text-center uppercase font-bold tracking-widest border-t border-white/10 pt-2">
      {t('zoom_earth_satellite')}
    </div>

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

// Approximate centre of a zone polygon (average of the outer ring vertices)
function getCentroid(geometry) {
  const coords = geometry?.coordinates;
  if (!coords) return null;
  let pts;
  if (geometry?.type === 'Polygon') pts = coords[0];
  else if (geometry?.type === 'MultiPolygon') pts = coords[0]?.[0];
  else return null;
  if (!pts || !pts.length) return null;
  let sumLon = 0;
  let sumLat = 0;
  pts.forEach(([lon, lat]) => { sumLon += lon; sumLat += lat; });
  return { lng: sumLon / pts.length, lat: sumLat / pts.length };
}

// Approximate middle vertex of a road / line feature
function getLineMidpoint(geometry) {
  const coords = geometry?.coordinates;
  if (!coords || !coords.length) return null;
  const mid = coords[Math.floor(coords.length / 2)] || coords[0];
  return { lng: mid[0], lat: mid[1] };
}

export default function LandslideCommandMap({
  zones = [],
  infrastructure = [],
  sensorNodes = [],
  citizenReports = [],
  selectedTarget = null,
  onTriggerAlert = () => {},
  t = (key) => key
}) {
  const iframeRef = useRef(null);
  const containerRef = useRef(null);
  const rafRef = useRef(null);
  const debugLogged = useRef(false);

  // Currently selected feature highlight (zone / road / node / report / external point)
  const [selected, setSelected] = useState(null);

  // Fly the OpenLayers camera to a lon/lat (the map uses Web Mercator)
  const flyTo = useCallback((lng, lat, zoom = 11) => {
    if (!iframeRef.current) return;
    try {
      const cw = iframeRef.current.contentWindow;
      if (cw && cw.__zeController && cw.__zeController.map) {
        const map = cw.__zeController.map;
        if (map.getView) {
          map.getView().animate({
            center: mercator([lng, lat]),
            zoom,
            duration: 1200
          });
        }
      }
    } catch (e) {
      // Ignore cross-origin error
    }
  }, []);

  // Select a feature and fly to it (used by map clicks)
  const handleSelect = useCallback(({ type, id, lng, lat, zoom = 11 }) => {
    setSelected({ type, id, lng, lat });
    flyTo(lng, lat, zoom);
  }, [flyTo]);

  // Handle Map Panning from external sources (sidebar cards, assets "Locate", citizen feed)
  useEffect(() => {
    if (selectedTarget) {
      setSelected({ type: 'external', id: null, lng: selectedTarget.lng, lat: selectedTarget.lat });
      flyTo(selectedTarget.lng, selectedTarget.lat, selectedTarget.zoom || 11);
    }
  }, [selectedTarget, flyTo]);

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
            stroke={selected?.type === 'zone' && selected.id === zone.properties?.zone_id ? '#ffffff' : getRiskColor(zone.properties?.current_risk_status, 1.0)}
            strokeWidth={selected?.type === 'zone' && selected.id === zone.properties?.zone_id ? 4 : 2}
            onMouseEnter={(e) => e.target.style.stroke = '#fff'}
            onMouseLeave={(e) => e.target.style.stroke = selected?.type === 'zone' && selected.id === zone.properties?.zone_id ? '#ffffff' : getRiskColor(zone.properties?.current_risk_status, 1.0)}
            onClick={() => {
              const c = getCentroid(zone.geometry);
              if (c) handleSelect({ type: 'zone', id: zone.properties?.zone_id, lng: c.lng, lat: c.lat, zoom: 11 });
            }}
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
            stroke={selected?.type === 'infra' && selected.id === infra.properties?.element_id ? '#ffffff' : (infra.properties?.current_status === 'blocked' ? '#ef4444' : '#3b82f6')}
            strokeWidth={selected?.type === 'infra' && selected.id === infra.properties?.element_id ? 5 : 3}
            strokeDasharray={infra.properties?.current_status === 'blocked' ? '6,6' : 'none'}
            onClick={() => {
              const c = getLineMidpoint(infra.geometry);
              if (c) handleSelect({ type: 'infra', id: infra.properties?.element_id, lng: c.lng, lat: c.lat, zoom: 11 });
            }}
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
          onClick={() => handleSelect({ type: 'node', id: node.node_id || node.node_code, lng: node.lon || 91.88, lat: node.lat || 25.75, zoom: 11 })}
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
          onClick={() => handleSelect({ type: 'report', id: report.report_id || report.id, lng: report.lng || report.lon, lat: report.lat, zoom: 11 })}
        >
          <Camera size={12} className="text-white" />
        </div>
      ))}

      {/* Selected Location Highlight Marker */}
      {selected && (
        <div
          className="ze-marker absolute flex items-center justify-center pointer-events-none z-[60] hidden"
          data-lon={selected.lng}
          data-lat={selected.lat}
          title="Selected location"
        >
          <div className="absolute w-6 h-6 rounded-full bg-white/40 border-2 border-white animate-ping"></div>
          <div className="w-3 h-3 rounded-full bg-white border-2 border-black shadow-[0_0_10px_rgba(255,255,255,0.9)]"></div>
        </div>
      )}

      {/* Map Legend Overlay — Collapsible */}
    <MapLegend t={t} />
    </div>
  );
}

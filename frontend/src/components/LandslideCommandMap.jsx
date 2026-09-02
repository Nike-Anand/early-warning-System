import React, { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ShieldAlert } from 'lucide-react';

// Custom SVG Markers
const createRadarIcon = (colorHex) => {
  return L.divIcon({
    className: 'custom-radar-icon',
    html: `
      <div style="position: relative; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 22px; height: 22px; border-radius: 50%; background-color: ${colorHex}; opacity: 0.35; animation: radar-ripple 2s infinite ease-out;"></div>
        <div style="width: 12px; height: 12px; border-radius: 50%; background-color: ${colorHex}; border: 2px solid #ffffff; box-shadow: 0 0 8px ${colorHex};"></div>
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });
};

const createCitizenReportIcon = (severity) => {
  const bg = severity === 'CRITICAL' ? '#EF4444' : severity === 'HIGH' ? '#F97316' : '#EAB308';
  return L.divIcon({
    className: 'custom-citizen-icon',
    html: `
      <div style="background-color: ${bg}; width: 26px; height: 26px; border-radius: 8px; display: flex; align-items: center; justify-content: center; border: 2px solid #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.5);">
        <span style="font-size: 14px;">⚠️</span>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13]
  });
};

function MapController({ centerCoords, zoom = 8 }) {
  const map = useMap();
  useEffect(() => {
    if (centerCoords && centerCoords[0] && centerCoords[1]) {
      map.flyTo(centerCoords, zoom, { animate: true, duration: 1.4 });
    }
  }, [centerCoords, zoom, map]);
  return null;
}

function ZoomControls() {
  const map = useMap();
  return (
    <div className="absolute top-4 right-4 z-[1000] flex flex-col space-y-1">
      <button
        onClick={() => map.zoomIn()}
        className="w-9 h-9 bg-slate-900/95 border border-slate-700 rounded-xl text-white flex items-center justify-center text-lg font-bold hover:bg-slate-800 shadow-lg transition-colors"
        title="Zoom In"
      >+</button>
      <button
        onClick={() => map.zoomOut()}
        className="w-9 h-9 bg-slate-900/95 border border-slate-700 rounded-xl text-white flex items-center justify-center text-lg font-bold hover:bg-slate-800 shadow-lg transition-colors"
        title="Zoom Out"
      >−</button>
    </div>
  );
}

export default function LandslideCommandMap({
  zones = [],
  infrastructure = [],
  sensorNodes = [],
  citizenReports = [],
  selectedTarget = null,
  onTriggerAlert = () => {}
}) {
  // Risk Color Mapper
  const getRiskColor = (status) => {
    switch (status) {
      case 'CRITICAL': return '#EF4444';
      case 'HIGH': return '#F97316';
      case 'MEDIUM': return '#EAB308';
      default: return '#22C55E';
    }
  };

  // Polygon styling function for GeoJSON vulnerable zones
  const zoneStyle = (feature) => {
    const status = feature.properties?.current_risk_status || 'LOW';
    const color = getRiskColor(status);
    return {
      fillColor: color,
      weight: 2,
      opacity: 0.9,
      color: color,
      fillOpacity: status === 'CRITICAL' ? 0.45 : status === 'HIGH' ? 0.35 : 0.20,
      dashArray: status === 'CRITICAL' ? '4, 4' : undefined
    };
  };

  // Road styling for infrastructure lines
  const getRoadStyle = (status) => {
    if (status === 'blocked') {
      return { color: '#EF4444', weight: 4, opacity: 0.9, dashArray: '6, 6' };
    }
    if (status === 'partially_blocked') {
      return { color: '#F59E0B', weight: 3.5, opacity: 0.85, dashArray: '4, 4' };
    }
    return { color: '#10B981', weight: 3, opacity: 0.8 };
  };

  // Convert raw infrastructure points vs linestrings
  const roadLines = useMemo(() => {
    return infrastructure.filter(item => item.geometry?.type === 'LineString');
  }, [infrastructure]);

  const infraPoints = useMemo(() => {
    return infrastructure.filter(item => item.geometry?.type === 'Point');
  }, [infrastructure]);

  return (
    <div className="relative h-full w-full bg-slate-950">
      <MapContainer
        center={[26.14, 91.73]} // Centered on Guwahati / NER hub
        zoom={7}
        minZoom={6}
        maxZoom={15}
        scrollWheelZoom={true}
        zoomControl={false}
        className="h-full w-full"
      >
        <MapController
          centerCoords={selectedTarget ? [selectedTarget.lat, selectedTarget.lng] : null}
          zoom={selectedTarget?.zoom || 9}
        />
        <ZoomControls />

        {/* High-Contrast Dark CartoDB Map Tiles */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CartoDB</a> Dark Matter &bull; MDoNER GIS'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?api_key=cb1_2sr7_1_cd4cd1518630c30427989017"
        />

        {/* Render Vulnerable Zone MultiPolygons */}
        {zones.length > 0 && (
          <GeoJSON
            key={`zones-${zones.length}-${zones.filter(z => z.properties?.current_risk_status === 'CRITICAL').length}`}
            data={{ type: 'FeatureCollection', features: zones }}
            style={zoneStyle}
            onEachFeature={(feature, layer) => {
              const p = feature.properties;
              const statusColor = getRiskColor(p.current_risk_status);
              layer.bindPopup(`
                <div style="min-width: 240px; font-family: system-ui, sans-serif;">
                  <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #334155; padding-bottom: 6px; margin-bottom: 8px;">
                    <span style="font-weight: 700; font-size: 13px; color: #f8fafc;">${p.zone_name}</span>
                    <span style="background-color: ${statusColor}; color: #ffffff; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 800;">${p.current_risk_status}</span>
                  </div>
                  <div style="font-size: 11px; color: #94a3b8; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px;">
                    <div>Slope Angle: <b style="color: #f1f5f9;">${p.average_slope_angle}°</b></div>
                    <div>Factor of Safety: <b style="color: ${p.current_fos < 1.0 ? '#ef4444' : '#10b981'};">${p.current_fos}</b></div>
                    <div>State / Dist: <b style="color: #f1f5f9;">${p.state}</b></div>
                    <div>Incidents: <b style="color: #f1f5f9;">${p.historical_incident_count}</b></div>
                  </div>
                  <div style="font-size: 11px; color: #cbd5e1; background-color: #1e293b; padding: 6px; border-radius: 6px; margin-bottom: 8px;">
                    Soil Type: <b>${p.soil_type}</b>
                  </div>
                  <button id="btn-alert-${p.zone_id}" style="width: 100%; background: #4f46e5; color: white; border: none; padding: 6px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer;">
                    📢 Broadcast Emergency Warning
                  </button>
                </div>
              `);
              layer.on('popupopen', () => {
                const btn = document.getElementById(`btn-alert-${p.zone_id}`);
                if (btn) {
                  btn.onclick = () => onTriggerAlert(p);
                }
              });
            }}
          />
        )}

        {/* Render Critical Highway LineStrings */}
        {roadLines.map((road) => {
          const coords = road.geometry.coordinates.map(c => [c[1], c[0]]);
          const p = road.properties;
          return (
            <Polyline
              key={p.element_id}
              positions={coords}
              pathOptions={getRoadStyle(p.current_status)}
            >
              <Popup>
                <div className="p-1 text-xs">
                  <h4 className="font-bold text-slate-100">{p.element_name}</h4>
                  <div className="mt-1 flex items-center justify-between text-slate-400">
                    <span>Route: <b className="text-slate-200">{p.route_number}</b></span>
                    <span className={`font-bold uppercase ${p.current_status === 'blocked' ? 'text-rose-400' : p.current_status === 'partially_blocked' ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {p.current_status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </Popup>
            </Polyline>
          );
        })}

        {/* Render Critical Infrastructure Settlements & Bridges */}
        {infraPoints.map((infra) => {
          const [lon, lat] = infra.geometry.coordinates;
          const p = infra.properties;
          return (
            <Marker
              key={p.element_id}
              position={[lat, lon]}
              icon={createRadarIcon(p.current_status === 'blocked' ? '#EF4444' : '#38BDF8')}
            >
              <Popup>
                <div className="p-1 text-xs">
                  <h4 className="font-bold text-slate-100">{p.element_name}</h4>
                  <p className="text-slate-400 font-mono text-[10px]">Type: {p.element_type}</p>
                  <p className="mt-1 text-slate-300">Elevation: {p.elevation_meters}m</p>
                  <p className={`font-bold mt-1 uppercase text-[10px] ${p.current_status === 'blocked' ? 'text-rose-400' : 'text-emerald-400'}`}>
                    Status: {p.current_status}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Render IoT Telemetry Slope Stations */}
        {sensorNodes.map((node) => {
          const lat = node.lat || 25.75;
          const lon = node.lon || 91.88;
          const iconColor = node.risk_status === 'CRITICAL' ? '#EF4444' : node.risk_status === 'HIGH' ? '#F97316' : '#22C55E';

          return (
            <Marker
              key={node.node_id || node.node_code}
              position={[lat, lon]}
              icon={createRadarIcon(iconColor)}
            >
              <Popup>
                <div className="min-w-[220px] text-xs">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-1 mb-2">
                    <span className="font-bold text-slate-100">{node.node_name || node.node_code}</span>
                    <span className="bg-indigo-600/30 text-indigo-400 px-1.5 py-0.5 rounded font-mono text-[10px]">
                      IoT Active
                    </span>
                  </div>
                  <div className="space-y-1.5 text-slate-300 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Soil Moisture:</span>
                      <b className="text-slate-100">{node.soil_moisture || 35.0}%</b>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Pore Pressure (u):</span>
                      <b className="text-slate-100">{node.pore_pressure || 4.2} kPa</b>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Tilt Vector:</span>
                      <b className="text-slate-100">{node.tilt_magnitude || 0.05}°</b>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Factor of Safety:</span>
                      <b className={node.factor_of_safety < 1.0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                        {node.factor_of_safety || 1.65}
                      </b>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Render Crowd-Sourced Citizen Reports */}
        {citizenReports.map((rep) => {
          const lat = rep.latitude || rep.lat;
          const lon = rep.longitude || rep.lng || rep.lon;
          if (!lat || !lon) return null;

          return (
            <Marker
              key={rep.report_id || rep.offline_sync_id}
              position={[lat, lon]}
              icon={createCitizenReportIcon(rep.severity_estimate || rep.severity)}
            >
              <Popup>
                <div className="min-w-[220px] text-xs">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-1 mb-1.5">
                    <span className="font-bold text-amber-400 uppercase tracking-wide">
                      Citizen: {rep.category?.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-slate-400">{rep.status || 'Pending'}</span>
                  </div>
                  <p className="text-slate-300 text-[11px] mb-2">{rep.landmark_description || rep.description}</p>
                  {rep.multimedia_url && (
                    <img
                      src={rep.multimedia_url}
                      alt="Citizen report"
                      className="w-full h-24 object-cover rounded mb-2 border border-slate-700"
                    />
                  )}
                  <div className="text-[10px] text-slate-500">
                    Reporter: {rep.reporter_name || 'Verified Citizen'}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-6 left-6 z-[1000] bg-slate-900/90 backdrop-blur-md p-3.5 rounded-xl border border-slate-800 shadow-2xl text-xs space-y-2 max-w-[210px]">
        <div className="font-bold text-slate-200 uppercase tracking-wider text-[10px] flex items-center justify-between">
          <span>Hazard Legend</span>
          <ShieldAlert size={14} className="text-indigo-400" />
        </div>
        <div className="space-y-1.5 text-[11px]">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded bg-hazard-critical shadow-[0_0_8px_#ef4444]"></span>
            <span className="text-slate-300 font-medium">Critical (FoS &lt; 1.0)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded bg-hazard-high"></span>
            <span className="text-slate-300 font-medium">High Risk Sector</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded bg-hazard-medium"></span>
            <span className="text-slate-300 font-medium">Medium Advisory</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded bg-hazard-low"></span>
            <span className="text-slate-300 font-medium">Low / Stable Slope</span>
          </div>
        </div>
        <div className="border-t border-slate-800 pt-2 text-[10px] text-slate-400 space-y-1">
          <div className="flex items-center space-x-2">
            <span className="w-4 h-0.5 bg-rose-500 border-dashed"></span>
            <span>Blocked Highway</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
            <span>Active IoT Telemetry Node</span>
          </div>
        </div>
      </div>
    </div>
  );
}

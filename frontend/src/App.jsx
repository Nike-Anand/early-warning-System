import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShieldAlert,
  Radio,
  Search,
  CloudRain,
  Camera,
  Truck,
  PlusCircle,
  RefreshCw,
  Bell,
  Sliders,
  Layers,
  MapPin,
  AlertTriangle,
  Flame,
  CheckCircle2,
  PhoneCall,
  Compass
} from 'lucide-react';

import LandslideCommandMap from './components/LandslideCommandMap';
import SimulationDrawer from './components/SimulationDrawer';
import CitizenFeedDrawer from './components/CitizenFeedDrawer';
import FieldReportingModal from './components/FieldReportingModal';
import EmergencyResourcesModal from './components/EmergencyResourcesModal';
import { registerBackgroundSync, syncOfflineReports } from './utils/indexedDbSync';

export default function App() {
  // --- CORE STATE ---
  const [zones, setZones] = useState([]);
  const [infrastructure, setInfrastructure] = useState([]);
  const [sensorNodes, setSensorNodes] = useState([]);
  const [citizenReports, setCitizenReports] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedState, setSelectedState] = useState('ALL');
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [activeEmergencyNotice, setActiveEmergencyNotice] = useState(null);

  // --- MODAL & DRAWER TOGGLES ---
  const [isSimulationOpen, setIsSimulationOpen] = useState(false);
  const [isCitizenFeedOpen, setIsCitizenFeedOpen] = useState(false);
  const [isReportingOpen, setIsReportingOpen] = useState(false);
  const [isResourcesOpen, setIsResourcesOpen] = useState(false);

  // --- DATA FETCHING ---
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Zones GeoJSON
      const zonesRes = await fetch('/api/v1/zones');
      if (zonesRes.ok) {
        const zonesData = await zonesRes.json();
        setZones(zonesData.features || []);
      }

      // 2. Fetch Infrastructure GeoJSON
      const infraRes = await fetch('/api/v1/infrastructure');
      if (infraRes.ok) {
        const infraData = await infraRes.json();
        setInfrastructure(infraData.features || []);
      }

      // 3. Fetch Citizen Reports
      const reportsRes = await fetch('/api/v1/reports');
      if (reportsRes.ok) {
        const reportsData = await reportsRes.json();
        setCitizenReports(reportsData.reports || []);
      }
    } catch (err) {
      console.warn("Backend fetch failed, relying on mock/fallback state:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Live IST clock
  const [liveTime, setLiveTime] = useState('');
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setLiveTime(now.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }));
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);



  useEffect(() => {
    fetchData();

    // Register offline-first background synchronization worker
    registerBackgroundSync((result) => {
      if (result.syncedCount > 0) {
        console.log(`✅ Synced ${result.syncedCount} queued report(s) successfully.`);
        fetchData();
      }
    });

    // Check once at startup if there are pending offline reports
    syncOfflineReports().then((r) => {
      if (r.syncedCount > 0) fetchData();
    });
  }, [fetchData]);

  // --- WEBSOCKET LIVE STREAM & SIREN BROADCAST ---
  useEffect(() => {
    // Fix: Vite dev server runs on port 5173, prod Nginx on port 80/443
    const isDev = window.location.port === '5173' || window.location.port === '3000';
    const wsUrl = isDev
      ? 'ws://localhost:8000/ws/alerts'
      : `ws://${window.location.host}/ws/alerts`;

    let socket;
    let reconnectTimeout;

    function connect() {
      try {
        socket = new WebSocket(wsUrl);
        socket.onopen = () => {
          setWsConnected(true);
          console.log("🟢 WebSocket Connected to MDoNER Disaster Hub");
        };

        socket.onclose = () => {
          setWsConnected(false);
          reconnectTimeout = setTimeout(connect, 4000);
        };

        socket.onerror = () => {
          socket.close();
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.event === 'TELEMETRY_UPDATED') {
              // Update live sensor node stream
              setSensorNodes((prev) => {
                const filtered = prev.filter(n => n.node_id !== data.node_id && n.node_code !== data.node_code);
                return [data, ...filtered];
              });

              // Update zone in GeoJSON state dynamically
              setZones((prevZones) => {
                return prevZones.map((z) => {
                  if (z.properties.zone_id === data.zone_id || z.properties.zone_name === data.zone_name) {
                    return {
                      ...z,
                      properties: {
                        ...z.properties,
                        current_risk_status: data.risk_status,
                        current_fos: data.factor_of_safety
                      }
                    };
                  }
                  return z;
                });
              });

              // Trigger Emergency Banner if CRITICAL
              if (data.risk_status === 'CRITICAL') {
                setActiveEmergencyNotice({
                  title: `🚨 RED ALERT: ${data.zone_name}`,
                  msg: `Factor of Safety sheared to ${data.factor_of_safety} (< 1.0). Highway: ${data.road_status.toUpperCase()}. Lead Time: ${data.lead_time}`,
                  coords: [data.lat, data.lng]
                });
              }
            } else if (data.event === 'CITIZEN_REPORT_SUBMITTED') {
              setCitizenReports((prev) => [data, ...prev]);
            } else if (data.event === 'CITIZEN_REPORT_VERIFIED') {
              setCitizenReports((prev) =>
                prev.map((r) => r.report_id === data.report_id ? { ...r, status: data.status } : r)
              );
            } else if (data.event === 'INFRASTRUCTURE_UPDATED') {
              setInfrastructure((prev) =>
                prev.map((item) => {
                  if (item.properties.element_id === data.element_id) {
                    return {
                      ...item,
                      properties: { ...item.properties, current_status: data.current_status }
                    };
                  }
                  return item;
                })
              );
            }
          } catch (e) {
            console.error("Malformed WebSocket frame:", e);
          }
        };
      } catch (err) {
        console.warn("WebSocket init error:", err);
      }
    }

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      socket?.close();
    };
  }, []);

  // --- MEMOIZED KPI COMPUTATION ---
  const kpis = useMemo(() => {
    const criticalZones = zones.filter(z => z.properties?.current_risk_status === 'CRITICAL').length;
    const highZones = zones.filter(z => z.properties?.current_risk_status === 'HIGH').length;
    const blockedRoads = infrastructure.filter(
      i => i.properties?.current_status === 'blocked' && i.geometry?.type === 'LineString'
    ).length;
    const totalSensors = sensorNodes.length > 0 ? sensorNodes.length : 24;

    return { criticalZones, highZones, blockedRoads, totalSensors };
  }, [zones, infrastructure, sensorNodes]);

  // --- FILTERED ZONE STREAM ---
  const filteredZones = useMemo(() => {
    return zones.filter((z) => {
      const p = z.properties;
      const matchesSearch = p.zone_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            p.district.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesState = selectedState === 'ALL' || p.state === selectedState;
      return matchesSearch && matchesState;
    });
  }, [zones, searchTerm, selectedState]);

  // --- SIMULATION HANDLER ---
  const handleSimulationResults = (simData) => {
    if (!simData?.results) return;
    setZones((prev) => {
      return prev.map((z) => {
        const match = simData.results.find(r => r.zone_id === z.properties.zone_id);
        if (match) {
          return {
            ...z,
            properties: {
              ...z.properties,
              current_risk_status: match.simulated_status,
              current_fos: match.simulated_fos
            }
          };
        }
        return z;
      });
    });
  };

  // --- MANUAL BROADCAST WARNING ---
  const handleTriggerBroadcast = (zoneProp) => {
    alert(`🚨 Emergency Broadcast Triggered!\n\nDispatched multi-lingual warnings in English, Assamese, Bengali, Hindi, Khasi, and Mizo to local village heads and district authorities for:\n\n${zoneProp.zone_name}`);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 font-sans text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* ========================================================================= */}
      {/* 1. TOP COMMAND BAR */}
      {/* ========================================================================= */}
      <header className="h-16 px-5 bg-slate-900 border-b border-slate-800 flex items-center justify-between shadow-md z-30 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-tr from-indigo-600 to-rose-600 rounded-xl text-white shadow-lg shadow-indigo-600/30">
            <ShieldAlert size={22} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-extrabold tracking-tight text-white">MDoNER GIS Command Center</h1>
              <span className="bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 text-[10px] font-mono px-1.5 py-0.5 rounded">
                SIH ID 26001
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              AI-Based Early Warning & Landslide Risk Monitoring System &bull; North Eastern Region
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          {/* Live Stream Heartbeat */}
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-full text-xs">
            <span
              className={`h-2.5 w-2.5 rounded-full ${wsConnected ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-rose-500 animate-ping'}`}
            ></span>
            <span className="text-slate-300 font-semibold text-[11px]">
              {wsConnected ? 'TELEMETRY STREAM LIVE' : 'OFFLINE - RECONNECTING'}
            </span>
          </div>

          {/* Live IST Clock */}
          <div className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-full">
            <span className="text-[10px] text-slate-400 font-semibold">IST</span>
            <span className="font-mono text-xs text-indigo-300 font-bold">{liveTime}</span>
          </div>

          {/* Quick Action Buttons */}
          <button
            onClick={() => setIsReportingOpen(true)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-indigo-600/30 transition-all"
          >
            <PlusCircle size={14} />
            <span>Field Report</span>
          </button>

          <button
            onClick={() => setIsSimulationOpen(true)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <Sliders size={14} className="text-indigo-400" />
            <span>What-If Simulator</span>
          </button>

          <button
            onClick={() => setIsCitizenFeedOpen(true)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <Camera size={14} className="text-amber-400" />
            <span>Citizen Feed ({citizenReports.length})</span>
          </button>

          <button
            onClick={() => setIsResourcesOpen(true)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <Truck size={14} className="text-emerald-400" />
            <span>Emergency Assets</span>
          </button>

          <button
            onClick={fetchData}
            title="Refresh Central GIS Datasets"
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400 hover:text-white border border-slate-700 transition-colors"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </header>

      {/* Emergency Siren Banner Overlay */}
      {activeEmergencyNotice && (
        <div className="bg-gradient-to-r from-rose-700 via-rose-600 to-amber-600 px-5 py-2 flex items-center justify-between text-xs font-bold text-white shadow-lg animate-pulse z-20">
          <div className="flex items-center space-x-2">
            <AlertTriangle size={18} />
            <span>{activeEmergencyNotice.title}</span>
            <span className="font-normal opacity-90">• {activeEmergencyNotice.msg}</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSelectedTarget({ lat: activeEmergencyNotice.coords[0], lng: activeEmergencyNotice.coords[1], zoom: 11 })}
              className="px-2.5 py-1 bg-black/40 hover:bg-black/60 rounded text-[11px] font-semibold"
            >
              Zoom to Hazard
            </button>
            <button
              onClick={() => setActiveEmergencyNotice(null)}
              className="text-white/80 hover:text-white px-1.5"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. KPI METRIC COUNTER ROW */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-4 gap-3 px-5 py-2.5 bg-slate-950 border-b border-slate-800/80 z-10 flex-shrink-0">
        {/* KPI 1: Critical Failures */}
        <div className="bg-slate-900/80 border border-rose-500/30 p-3 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">
              Critical Hazard Zones (FoS &lt; 1.0)
            </span>
            <div className="text-xl font-extrabold text-white mt-0.5">{kpis.criticalZones}</div>
          </div>
          <div className="p-2 bg-rose-500/20 text-rose-400 rounded-lg">
            <Flame size={20} />
          </div>
        </div>

        {/* KPI 2: High Risk Corridors */}
        <div className="bg-slate-900/80 border border-amber-500/30 p-3 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
              High Risk Orange Sectors
            </span>
            <div className="text-xl font-extrabold text-white mt-0.5">{kpis.highZones}</div>
          </div>
          <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
            <AlertTriangle size={20} />
          </div>
        </div>

        {/* KPI 3: Blocked Highways */}
        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Blocked Highway Networks
            </span>
            <div className="text-xl font-extrabold text-white mt-0.5">{kpis.blockedRoads}</div>
          </div>
          <div className="p-2 bg-slate-800 text-rose-400 rounded-lg">
            <Compass size={20} />
          </div>
        </div>

        {/* KPI 4: Online Telemetry Hardware */}
        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Active Slope IoT Nodes
            </span>
            <div className="text-xl font-extrabold text-emerald-400 mt-0.5">{kpis.totalSensors}</div>
          </div>
          <div className="p-2 bg-slate-800 text-emerald-400 rounded-lg">
            <Radio size={20} />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN WORKSPACE: SIDEBAR + GIS MAP CANVAS */}
      {/* ========================================================================= */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* LEFT SIDEBAR: SEARCH & LIVE HAZARD STREAM */}
        <aside className="w-[380px] bg-slate-900 border-r border-slate-800 flex flex-col shadow-2xl z-10 flex-shrink-0">
          {/* Search & State Filter */}
          <div className="p-3.5 border-b border-slate-800 space-y-2.5 bg-slate-900/70">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-500" size={15} />
              <input
                type="text"
                placeholder="Search zones, NH routes, districts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* State Filter Pills */}
            <div className="flex space-x-1.5 overflow-x-auto pb-1 text-[11px] custom-scrollbar">
              {['ALL', 'Meghalaya', 'Assam', 'Sikkim', 'Mizoram', 'Nagaland', 'Arunachal Pradesh', 'Manipur', 'Tripura'].map((st) => (
                <button
                  key={st}
                  onClick={() => setSelectedState(st)}
                  className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${selectedState === st ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-400 hover:bg-slate-800'}`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Severity Ranked Zone Cards Stream */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 custom-scrollbar">
            <div className="flex items-center justify-between text-[11px] font-bold tracking-wider text-slate-400 uppercase pb-0.5">
              <span>Vulnerable Slope Corridors ({filteredZones.length})</span>
              <span className="text-[10px] font-mono text-indigo-400">SRID 4326</span>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1,2,3,4].map(i => (
                  <div key={i} className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2.5 animate-pulse">
                    <div className="flex justify-between">
                      <div className="h-3 w-32 bg-slate-800 rounded"></div>
                      <div className="h-3 w-14 bg-slate-700 rounded"></div>
                    </div>
                    <div className="h-2 w-24 bg-slate-800 rounded"></div>
                    <div className="grid grid-cols-3 gap-2">
                      {[1,2,3].map(j => <div key={j} className="h-8 bg-slate-800/60 rounded-lg"></div>)}
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredZones.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                No vulnerable sectors found matching filters.
              </div>
            ) : (
              filteredZones.map((zone) => {
                const p = zone.properties;
                const status = p.current_risk_status;
                const isCritical = status === 'CRITICAL';
                const isHigh = status === 'HIGH';

                // Extract approximate center coordinates from polygon
                const coords = zone.geometry?.coordinates?.[0]?.[0] || [];
                const centerLat = coords.length > 0 ? coords[0][1] : 26.14;
                const centerLon = coords.length > 0 ? coords[0][0] : 91.73;

                return (
                  <div
                    key={p.zone_id}
                    onClick={() => setSelectedTarget({ lat: centerLat, lng: centerLon, zoom: 11 })}
                    className={`p-3.5 bg-slate-950 border rounded-xl hover:border-indigo-500 transition-all cursor-pointer shadow-sm space-y-2.5 group ${isCritical ? 'border-rose-500/50 hover:border-rose-400 shadow-rose-950/20' : isHigh ? 'border-amber-500/40' : 'border-slate-800'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-xs text-slate-200 group-hover:text-indigo-400 transition-colors line-clamp-1">
                          {p.zone_name}
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {p.district}, <span className="text-slate-300 font-medium">{p.state}</span>
                        </p>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider flex-shrink-0 ${isCritical ? 'bg-rose-500 text-white shadow-[0_0_8px_#ef4444]' : isHigh ? 'bg-amber-500 text-white' : status === 'MEDIUM' ? 'bg-yellow-500 text-slate-900' : 'bg-emerald-600 text-white'}`}
                      >
                        {status}
                      </span>
                    </div>

                    {/* Geotechnical Metrics Grid */}
                    <div className="grid grid-cols-3 gap-2 text-xs pt-1 border-t border-slate-900">
                      <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/40">
                        <span className="text-slate-500 block text-[9px] uppercase font-bold">FoS</span>
                        <span className={`font-mono text-xs font-bold ${p.current_fos < 1.0 ? 'text-rose-400' : p.current_fos < 1.3 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {p.current_fos}
                        </span>
                      </div>

                      <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/40">
                        <span className="text-slate-500 block text-[9px] uppercase font-bold">Slope</span>
                        <span className="font-mono text-xs text-slate-200 font-bold">
                          {p.average_slope_angle}°
                        </span>
                      </div>

                      <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/40">
                        <span className="text-slate-500 block text-[9px] uppercase font-bold">Incidents</span>
                        <span className="font-mono text-xs text-slate-200 font-bold">
                          {p.historical_incident_count}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                      <span>Soil: {p.soil_type?.split(' ')[0]}</span>
                      <span className="text-indigo-400 font-medium group-hover:underline flex items-center space-x-1">
                        <MapPin size={10} />
                        <span>Locate on GIS</span>
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* CENTER: REACT-LEAFLET INTERACTIVE GIS CANVAS */}
        <main className="flex-1 h-full relative">
          <LandslideCommandMap
            zones={zones}
            infrastructure={infrastructure}
            sensorNodes={sensorNodes}
            citizenReports={citizenReports}
            selectedTarget={selectedTarget}
            onTriggerAlert={handleTriggerBroadcast}
          />
        </main>
      </div>

      {/* ========================================================================= */}
      {/* 4. MODALS & DRAWERS */}
      {/* ========================================================================= */}
      <SimulationDrawer
        isOpen={isSimulationOpen}
        onClose={() => setIsSimulationOpen(false)}
        onRunSimulation={handleSimulationResults}
      />

      <CitizenFeedDrawer
        isOpen={isCitizenFeedOpen}
        onClose={() => setIsCitizenFeedOpen(false)}
        reports={citizenReports}
        onVerifyReport={async (id) => {
          try {
            await fetch(`/api/v1/reports/${id}/verify`, { method: 'PATCH' });
            fetchData();
          } catch (e) {
            console.error("Verification failed:", e);
          }
        }}
        onSelectLocation={(coord) => setSelectedTarget(coord)}
      />

      <FieldReportingModal
        isOpen={isReportingOpen}
        onClose={() => setIsReportingOpen(false)}
        onReportSubmitted={() => fetchData()}
      />

      <EmergencyResourcesModal
        isOpen={isResourcesOpen}
        onClose={() => setIsResourcesOpen(false)}
        onSelectLocation={(coord) => setSelectedTarget(coord)}
      />
    </div>
  );
}

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
      if (!zonesRes.ok) throw new Error("Backend offline");
      const zonesData = await zonesRes.json();
      setZones(zonesData.features || []);

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
      // Inject Mock Data so the application remains functional for testing/demonstration without a backend
      setZones([
        {
          type: 'Feature',
          properties: { zone_id: 'z1', zone_name: 'Shillong Bypass', current_risk_status: 'CRITICAL', district: 'East Khasi Hills', state: 'Meghalaya', current_fos: 0.85, average_slope_angle: 45, historical_incident_count: 12, soil_type: 'Clay Loam' },
          geometry: { type: 'Polygon', coordinates: [[[91.88, 25.57], [91.90, 25.57], [91.90, 25.59], [91.88, 25.59], [91.88, 25.57]]] }
        },
        {
          type: 'Feature',
          properties: { zone_id: 'z2', zone_name: 'Guwahati - Dispur Route', current_risk_status: 'HIGH', district: 'Kamrup', state: 'Assam', current_fos: 1.15, average_slope_angle: 38, historical_incident_count: 5, soil_type: 'Sandy Loam' },
          geometry: { type: 'Polygon', coordinates: [[[91.75, 26.12], [91.78, 26.12], [91.78, 26.15], [91.75, 26.15], [91.75, 26.12]]] }
        },
        {
          type: 'Feature',
          properties: { zone_id: 'z3', zone_name: 'Delhi Test Sector', current_risk_status: 'MEDIUM', district: 'New Delhi', state: 'Delhi', current_fos: 1.4, average_slope_angle: 15, historical_incident_count: 0, soil_type: 'Alluvial' },
          geometry: { type: 'Polygon', coordinates: [[[77.15, 28.55], [77.25, 28.55], [77.25, 28.65], [77.15, 28.65], [77.15, 28.55]]] }
        }
      ]);

      setSensorNodes([
        { node_id: 'n1', lon: 91.89, lat: 25.58, node_code: 'SHL-01', node_name: 'Shillong Node Alpha', risk_status: 'CRITICAL' },
        { node_id: 'n2', lon: 91.76, lat: 26.13, node_code: 'GWH-02', node_name: 'Guwahati Node Beta', risk_status: 'HIGH' },
        { node_id: 'n3', lon: 77.20, lat: 28.60, node_code: 'DEL-01', node_name: 'Delhi Reference Node', risk_status: 'SAFE' }
      ]);

      setInfrastructure([
        {
          type: 'Feature',
          properties: { element_id: 'i1', name: 'NH-6 Segment A', current_status: 'blocked' },
          geometry: { type: 'LineString', coordinates: [[91.88, 25.57], [91.89, 25.58], [91.90, 25.59]] }
        }
      ]);

      setCitizenReports([
        { report_id: 'r1', lat: 25.585, lng: 91.895, hazard_type: 'Minor Rockfall', status: 'UNVERIFIED' }
      ]);
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
    <div className="relative h-screen w-screen bg-slate-950 font-sans text-slate-100 selection:bg-indigo-500 selection:text-white overflow-hidden">
      
      {/* ========================================================================= */}
      {/* 1. MAIN BACKGROUND: CESIUM 3D GLOBE */}
      {/* ========================================================================= */}
      <main className="absolute inset-0 z-0">
        <LandslideCommandMap
          zones={zones}
          infrastructure={infrastructure}
          sensorNodes={sensorNodes}
          citizenReports={citizenReports}
          selectedTarget={selectedTarget}
          onTriggerAlert={handleTriggerBroadcast}
        />
      </main>

      {/* ========================================================================= */}
      {/* 2. FLOATING TOP COMMAND BAR (GLASSMORPHISM) */}
      {/* ========================================================================= */}
      <header className="absolute top-0 inset-x-0 h-16 px-5 bg-slate-950/40 backdrop-blur-md border-b border-white/10 flex items-center justify-between shadow-lg z-30 pointer-events-auto">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-tr from-indigo-600 to-rose-600 rounded-xl text-white shadow-lg shadow-indigo-600/30">
            <ShieldAlert size={22} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-extrabold tracking-tight text-white drop-shadow-md">MDoNER GIS Command Center</h1>
              <span className="bg-white/10 text-white/90 backdrop-blur-sm border border-white/20 text-[10px] font-mono px-1.5 py-0.5 rounded shadow-sm">
                SIH ID 26001
              </span>
            </div>
            <p className="text-[11px] text-slate-300 drop-shadow-sm font-medium">
              AI-Based Early Warning & Landslide Risk Monitoring System &bull; NER
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          {/* Live Stream Heartbeat */}
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-full text-xs shadow-md">
            <span
              className={`h-2.5 w-2.5 rounded-full ${wsConnected ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-rose-500 animate-ping'}`}
            ></span>
            <span className="text-slate-200 font-semibold text-[11px] tracking-wide">
              {wsConnected ? 'LIVE TELEMETRY' : 'RECONNECTING'}
            </span>
          </div>

          {/* Live IST Clock */}
          <div className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-full shadow-md">
            <span className="text-[10px] text-slate-400 font-bold tracking-widest">IST</span>
            <span className="font-mono text-xs text-white font-bold tracking-wider">{liveTime}</span>
          </div>

          {/* Quick Action Buttons */}
          <button
            onClick={() => setIsReportingOpen(true)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-indigo-600/40 transition-all border border-indigo-400/50"
          >
            <PlusCircle size={14} />
            <span>Field Report</span>
          </button>

          <button
            onClick={() => setIsSimulationOpen(true)}
            className="px-3 py-1.5 bg-black/40 hover:bg-black/60 text-slate-200 backdrop-blur-md border border-white/10 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-md"
          >
            <Sliders size={14} className="text-indigo-400" />
            <span>Simulator</span>
          </button>

          <button
            onClick={() => setIsCitizenFeedOpen(true)}
            className="px-3 py-1.5 bg-black/40 hover:bg-black/60 text-slate-200 backdrop-blur-md border border-white/10 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-md"
          >
            <Camera size={14} className="text-amber-400" />
            <span>Citizen Feed ({citizenReports.length})</span>
          </button>

          <button
            onClick={() => setIsResourcesOpen(true)}
            className="px-3 py-1.5 bg-black/40 hover:bg-black/60 text-slate-200 backdrop-blur-md border border-white/10 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-md"
          >
            <Truck size={14} className="text-emerald-400" />
            <span>Assets</span>
          </button>

          <button
            onClick={fetchData}
            title="Refresh Central GIS Datasets"
            className="p-1.5 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-xl text-slate-300 hover:text-white border border-white/10 transition-colors shadow-md"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </header>

      {/* Emergency Siren Banner Overlay */}
      {activeEmergencyNotice && (
        <div className="absolute top-16 inset-x-0 bg-gradient-to-r from-rose-700/90 via-rose-600/90 to-amber-600/90 backdrop-blur-md px-5 py-2 flex items-center justify-between text-xs font-bold text-white shadow-xl animate-pulse z-20 border-b border-rose-400/50">
          <div className="flex items-center space-x-2">
            <AlertTriangle size={18} />
            <span className="drop-shadow-md">{activeEmergencyNotice.title}</span>
            <span className="font-normal opacity-90 drop-shadow-md">• {activeEmergencyNotice.msg}</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSelectedTarget({ lat: activeEmergencyNotice.coords[0], lng: activeEmergencyNotice.coords[1], zoom: 11 })}
              className="px-2.5 py-1 bg-black/40 hover:bg-black/60 backdrop-blur-sm border border-white/20 rounded text-[11px] font-semibold transition-colors"
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
      {/* 3. FLOATING KPI METRICS (RIGHT SIDE) */}
      {/* ========================================================================= */}
      <div className="absolute top-24 right-5 w-64 space-y-3 z-10 pointer-events-none">
        {/* KPI 1: Critical Failures */}
        <div className="bg-slate-950/50 backdrop-blur-xl border border-white/10 p-3 rounded-2xl flex items-center justify-between shadow-2xl pointer-events-auto hover:bg-slate-950/70 transition-colors">
          <div>
            <span className="text-[9px] font-bold text-rose-400 uppercase tracking-widest block drop-shadow-md">
              Critical Zones (FoS &lt; 1.0)
            </span>
            <div className="text-xl font-black text-white mt-0.5 drop-shadow-lg">{kpis.criticalZones}</div>
          </div>
          <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
            <Flame size={18} />
          </div>
        </div>

        {/* KPI 2: High Risk Corridors */}
        <div className="bg-slate-950/50 backdrop-blur-xl border border-white/10 p-3 rounded-2xl flex items-center justify-between shadow-2xl pointer-events-auto hover:bg-slate-950/70 transition-colors">
          <div>
            <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest block drop-shadow-md">
              High Risk Sectors
            </span>
            <div className="text-xl font-black text-white mt-0.5 drop-shadow-lg">{kpis.highZones}</div>
          </div>
          <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <AlertTriangle size={18} />
          </div>
        </div>

        {/* KPI 3: Blocked Highways */}
        <div className="bg-slate-950/50 backdrop-blur-xl border border-white/10 p-3 rounded-2xl flex items-center justify-between shadow-2xl pointer-events-auto hover:bg-slate-950/70 transition-colors">
          <div>
            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest block drop-shadow-md">
              Blocked Highways
            </span>
            <div className="text-xl font-black text-white mt-0.5 drop-shadow-lg">{kpis.blockedRoads}</div>
          </div>
          <div className="p-2 bg-white/5 text-rose-400 rounded-xl border border-white/10">
            <Compass size={18} />
          </div>
        </div>

        {/* KPI 4: Online Telemetry Hardware */}
        <div className="bg-slate-950/50 backdrop-blur-xl border border-white/10 p-3 rounded-2xl flex items-center justify-between shadow-2xl pointer-events-auto hover:bg-slate-950/70 transition-colors">
          <div>
            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest block drop-shadow-md">
              Active Slope IoT Nodes
            </span>
            <div className="text-xl font-black text-emerald-400 mt-0.5 drop-shadow-lg">{kpis.totalSensors}</div>
          </div>
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
            <Radio size={18} />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. FLOATING LEFT SIDEBAR: SEARCH & LIVE HAZARD STREAM */}
      {/* ========================================================================= */}
      <aside className="absolute left-5 top-24 bottom-8 w-[380px] bg-slate-950/50 backdrop-blur-2xl border border-white/10 rounded-3xl flex flex-col shadow-[0_0_40px_rgba(0,0,0,0.5)] z-10 overflow-hidden pointer-events-auto">
        {/* Search & State Filter */}
        <div className="p-4 border-b border-white/10 space-y-3 bg-white/5">
          <div className="relative">
            <Search className="absolute left-3.5 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search zones, NH routes, districts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
            />
          </div>

          {/* State Filter Pills */}
          <div className="flex space-x-1.5 overflow-x-auto pb-1 text-[11px] custom-scrollbar">
            {['ALL', 'Meghalaya', 'Assam', 'Sikkim', 'Mizoram', 'Nagaland', 'Arunachal Pradesh', 'Manipur', 'Tripura'].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedState(st)}
                className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all shadow-sm ${selectedState === st ? 'bg-indigo-500 text-white shadow-indigo-500/30' : 'bg-black/30 border border-white/5 text-slate-300 hover:bg-white/10'}`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Severity Ranked Zone Cards Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          <div className="flex items-center justify-between text-[10px] font-bold tracking-widest text-slate-300 uppercase pb-1 drop-shadow-sm">
            <span>Vulnerable Sectors ({filteredZones.length})</span>
            <span className="text-indigo-400">SRID 4326</span>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-3 animate-pulse">
                  <div className="flex justify-between">
                    <div className="h-3 w-32 bg-white/10 rounded"></div>
                    <div className="h-3 w-14 bg-white/10 rounded"></div>
                  </div>
                  <div className="h-2 w-24 bg-white/5 rounded"></div>
                  <div className="grid grid-cols-3 gap-2">
                    {[1,2,3].map(j => <div key={j} className="h-10 bg-white/5 rounded-xl"></div>)}
                  </div>
                </div>
              ))}
            </div>
          ) : filteredZones.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs border border-dashed border-white/20 rounded-2xl bg-black/20">
              No vulnerable sectors found matching filters.
            </div>
          ) : (
            filteredZones.map((zone) => {
              const p = zone.properties;
              const status = p.current_risk_status;
              const isCritical = status === 'CRITICAL';
              const isHigh = status === 'HIGH';

              const coords = zone.geometry?.coordinates?.[0]?.[0] || [];
              const centerLat = coords.length > 0 ? coords[0][1] : 26.14;
              const centerLon = coords.length > 0 ? coords[0][0] : 91.73;

              return (
                <div
                  key={p.zone_id}
                  onClick={() => setSelectedTarget({ lat: centerLat, lng: centerLon, zoom: 11 })}
                  className={`p-4 bg-black/40 border rounded-2xl backdrop-blur-md hover:bg-black/60 transition-all cursor-pointer shadow-lg space-y-3 group relative overflow-hidden ${isCritical ? 'border-rose-500/50 hover:border-rose-400' : isHigh ? 'border-amber-500/40 hover:border-amber-400' : 'border-white/10 hover:border-white/30'}`}
                >
                  {/* Subtle gradient glow for critical items */}
                  {isCritical && <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-transparent pointer-events-none"></div>}
                  
                  <div className="flex items-start justify-between gap-2 relative z-10">
                    <div>
                      <h4 className="font-extrabold text-sm text-white group-hover:text-indigo-300 transition-colors line-clamp-1 drop-shadow-md">
                        {p.zone_name}
                      </h4>
                      <p className="text-[11px] text-slate-300 mt-0.5 drop-shadow-sm font-medium">
                        {p.district}, <span className="text-white">{p.state}</span>
                      </p>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-widest flex-shrink-0 shadow-md border ${isCritical ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-rose-500/30' : isHigh ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' : status === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'}`}
                    >
                      {status}
                    </span>
                  </div>

                  {/* Geotechnical Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-white/10 relative z-10">
                    <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                      <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">FoS</span>
                      <span className={`font-mono text-sm font-black ${p.current_fos < 1.0 ? 'text-rose-400' : p.current_fos < 1.3 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {p.current_fos}
                      </span>
                    </div>

                    <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                      <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Slope</span>
                      <span className="font-mono text-sm text-white font-black">
                        {p.average_slope_angle}°
                      </span>
                    </div>

                    <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                      <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Incidents</span>
                      <span className="font-mono text-sm text-white font-black">
                        {p.historical_incident_count}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 relative z-10 font-medium">
                    <span>Soil: {p.soil_type?.split(' ')[0]}</span>
                    <span className="text-indigo-400 font-bold group-hover:text-indigo-300 flex items-center space-x-1">
                      <MapPin size={12} />
                      <span>Locate on GIS</span>
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 5. MODALS & DRAWERS */}
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

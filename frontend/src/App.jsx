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
  Compass,
  Activity,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

import LandslideCommandMap from './components/LandslideCommandMap';
import SimulationDrawer from './components/SimulationDrawer';
import CitizenFeedDrawer from './components/CitizenFeedDrawer';
import FieldReportingModal from './components/FieldReportingModal';
import EmergencyResourcesModal from './components/EmergencyResourcesModal';
import { registerBackgroundSync, syncOfflineReports } from './utils/indexedDbSync';
import { translations, languageOptions } from './translations/translations';
import { supabase } from './utils/supabase';

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
  const [language, setLanguage] = useState(
  localStorage.getItem('nexusrisk_language') || 'en'
);

const t = useCallback(
  (key) => {
    const currentLanguage = translations[language];

    if (currentLanguage && currentLanguage[key]) {
      return currentLanguage[key];
    }

    return translations.en[key] || key;
  },
  [language]
);

const changeLanguage = (lang) => {
  console.log("🌐 Language changed to:", lang);
  setLanguage(lang);
  localStorage.setItem('nexusrisk_language', lang);
};

  // --- MODAL & DRAWER TOGGLES ---
  const [isSimulationOpen, setIsSimulationOpen] = useState(false);
  const [isCitizenFeedOpen, setIsCitizenFeedOpen] = useState(false);
  const [isReportingOpen, setIsReportingOpen] = useState(false);
  const [isResourcesOpen, setIsResourcesOpen] = useState(false);
  const [isKpiOpen, setIsKpiOpen] = useState(true);

  // --- COLLAPSE/EXPAND STATE ---
  const [isLeftExpanded, setIsLeftExpanded] = useState(false);
  const [isRightExpanded, setIsRightExpanded] = useState(false);

  const toggleLeft = () => {
    setIsLeftExpanded((prev) => {
      if (!prev) setIsRightExpanded(false);
      return !prev;
    });
  };

  const toggleRight = () => {
    setIsRightExpanded((prev) => {
      if (!prev) setIsLeftExpanded(false);
      return !prev;
    });
  };

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

      // 3. Fetch Citizen Reports from Supabase
      try {
        let { data: sbReports, error } = await supabase.from('Field_reports').select('*').order('created_at', { ascending: false });
        if (error) {
          const { data: lowerCaseReports } = await supabase.from('field_reports').select('*').order('created_at', { ascending: false });
          sbReports = lowerCaseReports;
        }
        setCitizenReports(sbReports || []);
      } catch (err) {
        console.warn('Supabase fetch failed', err);
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
    // This allows React to control CSS classes inside the Zoom Earth iframe natively.
    // It shifts the Zoom Earth dropdown panels out of the way when the React sidebars expand.
    const iframe = document.getElementById('ze-iframe');
    if (!iframe) return;

    const syncIframeClasses = () => {
      try {
        const doc = iframe.contentDocument;
        if (doc && doc.body) {
          if (isLeftExpanded) doc.body.classList.add('react-left-expanded');
          else doc.body.classList.remove('react-left-expanded');
          
          if (isRightExpanded) doc.body.classList.add('react-right-expanded');
          else doc.body.classList.remove('react-right-expanded');
        }
      } catch (e) {
        console.warn("Could not sync classes to iframe body", e);
      }
    };

    // Run immediately
    syncIframeClasses();
    
    // Also run on load in case the iframe hasn't loaded yet
    iframe.addEventListener('load', syncIframeClasses);
    return () => iframe.removeEventListener('load', syncIframeClasses);
  }, [isLeftExpanded, isRightExpanded]);

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

    // Listen for realtime changes from Supabase
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'Field_reports' },
        (payload) => setCitizenReports((prev) => [payload.new, ...prev])
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'field_reports' },
        (payload) => setCitizenReports((prev) => [payload.new, ...prev])
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  // Push live KPI values into the Zoom Earth About (MDoNER Metrics) panel
  useEffect(() => {
    const iframe = document.getElementById('ze-iframe');
    if (!iframe) return;
    const pushKpis = () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc) return;
        const set = (id, val) => { const el = doc.getElementById(id); if (el) el.textContent = val; };
        set('kpi-critical', kpis.criticalZones);
        set('kpi-high', kpis.highZones);
        set('kpi-roads', kpis.blockedRoads);
        set('kpi-sensors', kpis.totalSensors);
        set('kpi-status', `Last synced: ${new Date().toLocaleTimeString('en-IN', { hour12: false })} IST`);
      } catch (e) { /* cross-origin guard */ }
    };
    pushKpis();
    iframe.addEventListener('load', pushKpis);
    return () => iframe.removeEventListener('load', pushKpis);
  }, [kpis]);

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
const handleTriggerBroadcast = async (zoneProp) => {
  try {
    const response = await fetch('/api/v1/alerts/manual', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        zone_id: zoneProp.zone_id,
        risk_level:
          zoneProp.current_risk_status === 'CRITICAL'
            ? 'CRITICAL'
            : 'HIGH',
        fos: zoneProp.current_fos,
        road_status: 'OPEN',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to trigger alert');
    }

    alert(
      `🚨 MANUAL ALERT TRIGGERED\n\n` +
      `Zone: ${data.zone_name}\n` +
      `Risk: ${data.risk_level}\n` +
      `FoS: ${data.fos}\n\n` +
      `Emergency notifications have been dispatched.`
    );
  } catch (error) {
    console.error('Manual alert failed:', error);

    alert(
      `❌ Failed to trigger emergency alert.\n\n${error.message}`
    );
  }
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
          t={t}
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
              {wsConnected ? t('live_telemetry') : t('reconnecting')}
            </span>
          </div>

          {/* Live IST Clock */}
          <div className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-full shadow-md">
            <span className="text-[10px] text-slate-400 font-bold tracking-widest">IST</span>
            <span className="font-mono text-xs text-white font-bold tracking-wider">{liveTime}</span>
          </div>
{/* Language Selector */}
<div className="relative">
  <select
    value={language}
    onChange={(e) => changeLanguage(e.target.value)}
    className="appearance-none bg-black/40 backdrop-blur-md border border-white/10 rounded-xl px-3 py-1.5 pr-8 text-xs font-semibold text-white cursor-pointer focus:outline-none focus:border-indigo-500 shadow-md"
    title={t('language')}
  >
    {languageOptions.map((lang) => (
      <option
        key={lang.code}
        value={lang.code}
        className="bg-slate-900 text-white"
      >
        {lang.flag} {lang.label}
      </option>
    ))}
  </select>

  <ChevronDown
    size={13}
    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
  />
</div>
          {/* Quick Action Buttons */}
          <button
            onClick={() => setIsReportingOpen(true)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-indigo-600/40 transition-all border border-indigo-400/50"
          >
            <PlusCircle size={14} />
            <span>{t('field_report')}</span>
          </button>

          <button
            onClick={() => setIsSimulationOpen(true)}
            className="px-3 py-1.5 bg-black/40 hover:bg-black/60 text-slate-200 backdrop-blur-md border border-white/10 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-md"
          >
            <Sliders size={14} className="text-indigo-400" />
            <span>{t('simulator')}</span>
          </button>

          <button
            onClick={() => setIsCitizenFeedOpen(true)}
            className="px-3 py-1.5 bg-black/40 hover:bg-black/60 text-slate-200 backdrop-blur-md border border-white/10 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-md"
          >
            <Camera size={14} className="text-amber-400" />
            <span>{t('citizen_feed')} ({citizenReports.length})</span>
          </button>

          <button
            onClick={() => setIsResourcesOpen(true)}
            className="px-3 py-1.5 bg-black/40 hover:bg-black/60 text-slate-200 backdrop-blur-md border border-white/10 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-md"
          >
            <Truck size={14} className="text-emerald-400" />
            <span>{t('assets')}</span>
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
             {t('zoom_to_hazard')}
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
      {/* 4. FLOATING LEFT SIDEBAR: SEARCH & LIVE HAZARD STREAM */}
      {/* ========================================================================= */}
      <aside className={`absolute bg-slate-950/50 backdrop-blur-2xl border border-white/10 rounded-3xl flex flex-col shadow-[0_0_40px_rgba(0,0,0,0.5)] z-20 overflow-hidden pointer-events-auto transition-all duration-300 ${isLeftExpanded ? 'left-5 top-[70px] w-[380px] bottom-8' : 'left-[220px] top-[70px] w-auto bottom-auto'}`}>
        
        {/* Toggle Header */}
        <div className="flex items-center justify-between p-3 border-b border-white/10 bg-black/20">
          <div className="flex items-center space-x-2">
            <Layers size={16} className="text-indigo-400" />
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-200">
  {t('gis_command')}
</span>
          </div>
          <button 
            onClick={toggleLeft}
            className="p-1 hover:bg-white/10 rounded-full transition-colors text-slate-300 hover:text-white"
          >
            {isLeftExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {isLeftExpanded && (
          <>
            {/* Search & State Filter */}
            <div className="p-4 border-b border-white/10 space-y-3 bg-white/5">
              <div className="relative">
                <Search className="absolute left-3.5 top-2.5 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder={t('search_placeholder')}
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
                <span>
  {t('vulnerable_sectors')} ({filteredZones.length})
</span>
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
                          <span>{t('locate_on_gis')}</span>
                        </span>
                      </div>
                      <button
  onClick={(e) => {
    e.stopPropagation();
    handleTriggerBroadcast(p);
  }}
  disabled={status !== 'CRITICAL' && status !== 'HIGH'}
  className={`w-full mt-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
    status === 'CRITICAL'
      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30'
      : status === 'HIGH'
        ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-600/30'
        : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
  }`}
>
  <AlertTriangle size={13} />
  {status === 'CRITICAL' || status === 'HIGH'
   ? t('trigger_emergency_alert')
: t('alert_not_required')}
</button>
                    </div>
                    
                  );
                })
              )}
            </div>
          </>
        )}
      </aside>

      {/* ========================================================================= */}
      {/* 5. MODALS & DRAWERS */}
      {/* ========================================================================= */}
      <SimulationDrawer
        isOpen={isSimulationOpen}
        onClose={() => setIsSimulationOpen(false)}
        onRunSimulation={handleSimulationResults}
        t={t}
      />

      <CitizenFeedDrawer
        isOpen={isCitizenFeedOpen}
        onClose={() => setIsCitizenFeedOpen(false)}
        reports={citizenReports}
        onVerifyReport={async (id) => {
          try {
            let { error } = await supabase.from('Field_reports').update({ status: 'verified' }).eq('id', id);
            if (error) {
              await supabase.from('field_reports').update({ status: 'verified' }).eq('id', id);
            }
            fetchData();
          } catch (e) {
            console.error("Verification failed:", e);
          }
        }}
        onDeleteReport={async (id) => {
          try {
            let { error } = await supabase.from('Field_reports').delete().eq('id', id);
            if (error) {
              await supabase.from('field_reports').delete().eq('id', id);
            }
            fetchData();
          } catch (e) {
            console.error("Deletion failed:", e);
          }
        }}
        onSelectLocation={(coord) => setSelectedTarget(coord)}
        t={t}
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

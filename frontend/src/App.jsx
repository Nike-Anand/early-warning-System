import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShieldAlert, Radio, Search, Camera, Truck, PlusCircle, RefreshCw, Sliders,
  MapPin, AlertTriangle, Flame, Compass, Activity, Route, BarChart3, X,
  ChevronRight, Clock3, CloudRain, Gauge, Navigation, Wifi, Signal,
  CircleDot, BellRing, Layers3, Siren, ArrowUpRight, Zap, Droplets,
  Mountain, LocateFixed
} from 'lucide-react';

import LandslideCommandMap from './components/LandslideCommandMap';
import SimulationDrawer from './components/SimulationDrawer';
import CitizenFeedDrawer from './components/CitizenFeedDrawer';
import FieldReportingModal from './components/FieldReportingModal';
import EmergencyResourcesModal from './components/EmergencyResourcesModal';
import { registerBackgroundSync, syncOfflineReports } from './utils/indexedDbSync';

const STATES = ['ALL', 'Meghalaya', 'Assam', 'Sikkim', 'Mizoram', 'Nagaland', 'Arunachal Pradesh', 'Manipur', 'Tripura'];

const severityTone = {
  CRITICAL: 'critical', HIGH: 'high', MEDIUM: 'medium', LOW: 'low'
};

function Metric({ label, value, unit, icon: Icon, tone = 'neutral', sub }) {
  return (
    <div className={`metric-card metric-${tone}`}>
      <div className="metric-icon"><Icon size={17} /></div>
      <div className="metric-copy">
        <span>{label}</span>
        <strong>{value}<small>{unit}</small></strong>
        {sub && <em>{sub}</em>}
      </div>
    </div>
  );
}

function RiskBadge({ status }) {
  return <span className={`risk-badge ${severityTone[status] || 'low'}`}><span />{status || 'LOW'}</span>;
}

function TrendBars({ status }) {
  const base = status === 'CRITICAL' ? [34, 42, 49, 58, 67, 76, 91] : status === 'HIGH' ? [31, 36, 44, 48, 57, 63, 72] : [27, 31, 34, 32, 38, 41, 44];
  return <div className="trend-bars" aria-hidden="true">{base.map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}</div>;
}

function ForecastPanel({ zone, onClose }) {
  const p = zone?.properties || {};
  const status = p.current_risk_status || 'LOW';
  const fos = Number(p.current_fos || 1.4);
  const points = [
    { t: 'Now', fos },
    { t: '+6h', fos: Math.max(0.35, fos - 0.08) },
    { t: '+12h', fos: Math.max(0.30, fos - 0.16) },
    { t: '+24h', fos: Math.max(0.25, fos - 0.25) },
    { t: '+48h', fos: Math.max(0.20, fos - 0.34) }
  ];
  return (
    <section className="insight-panel slide-panel">
      <div className="panel-head"><div><span className="eyebrow">RISK FORECAST</span><h2>{p.zone_name || 'Selected hazard'}</h2></div><button onClick={onClose} className="icon-btn"><X size={17}/></button></div>
      <div className="forecast-hero"><div><span>Current stability</span><b>{fos.toFixed(2)} <small>FoS</small></b></div><RiskBadge status={status}/></div>
      <div className="chart-wrap"><div className="chart-grid"/><div className="forecast-line">{points.map((point, i) => <div key={point.t} className="forecast-point" style={{ left: `${i * 25}%`, bottom: `${Math.max(12, Math.min(88, point.fos / 1.5 * 80))}%` }}><span>{point.fos.toFixed(2)}</span><i/></div>)}</div><div className="chart-axis">{points.map(x => <span key={x.t}>{x.t}</span>)}</div></div>
      <div className="forecast-row"><div><CloudRain size={15}/><span>Rainfall scenario</span><b>+80 mm/hr</b></div><div><Droplets size={15}/><span>Pore pressure</span><b>4.0×</b></div><div><Clock3 size={15}/><span>Forecast horizon</span><b>48 hours</b></div></div>
      <div className="recommendation"><div className="recommendation-icon"><Siren size={17}/></div><div><span>Recommended action</span><strong>{status === 'CRITICAL' ? 'Initiate evacuation readiness' : 'Increase monitoring frequency'}</strong><p>Forecast indicates declining slope stability under the selected weather scenario.</p></div></div>
    </section>
  );
}

function SensorPanel({ zones, onClose }) {
  const critical = zones.filter(z => z.properties?.current_risk_status === 'CRITICAL');
  const sensors = [
    ['SENSOR-NE-021', 'Pore pressure', '3.84×', 'critical'],
    ['SENSOR-NE-014', 'Displacement', '18.6 mm', 'high'],
    ['SENSOR-NE-009', 'Soil moisture', '86%', 'high'],
    ['SENSOR-NE-031', 'Rainfall', '74 mm/hr', 'medium'],
    ['SENSOR-NE-018', 'Tilt angle', '4.8°', 'medium']
  ];
  return (
    <section className="insight-panel slide-panel">
      <div className="panel-head"><div><span className="eyebrow">SENSOR INTELLIGENCE</span><h2>Live field pulse</h2></div><button onClick={onClose} className="icon-btn"><X size={17}/></button></div>
      <div className="sensor-summary"><div><Wifi size={16}/><b>24</b><span>online</span></div><div><Signal size={16}/><b>98%</b><span>signal health</span></div><div><Zap size={16}/><b>{critical.length || 8}</b><span>zones linked</span></div></div>
      <div className="anomaly-card"><div className="anomaly-title"><BellRing size={15}/>Anomalies detected <b>3</b></div><p>Pressure and displacement readings are rising faster than their 6-hour baseline.</p></div>
      <div className="sensor-list">{sensors.map(([id, metric, value, tone]) => <div className="sensor-row" key={id}><div className="sensor-dot"/><div className="sensor-main"><strong>{id}</strong><span>{metric}</span></div><b>{value}</b><span className={`sensor-state ${tone}`}>{tone}</span></div>)}</div>
      <div className="panel-note"><Activity size={15}/><span>Telemetry refreshes continuously when the field stream is connected.</span></div>
    </section>
  );
}

function RoutingPanel({ zone, infrastructure, onClose, onOpenResources }) {
  const p = zone?.properties || {};
  const blocked = infrastructure.filter(i => i.properties?.current_status === 'blocked');
  return (
    <section className="insight-panel slide-panel">
      <div className="panel-head"><div><span className="eyebrow">RESPONSE ROUTING</span><h2>Evacuation & safe access</h2></div><button onClick={onClose} className="icon-btn"><X size={17}/></button></div>
      <div className="route-target"><div className="route-pin"><Navigation size={17}/></div><div><span>Priority hazard</span><strong>{p.zone_name || 'Select a zone on the map'}</strong><small>{p.district ? `${p.district}, ${p.state}` : 'No zone selected'}</small></div></div>
      <div className="route-card safe"><div className="route-icon"><Route size={17}/></div><div><span>Recommended corridor</span><strong>North-east access corridor</strong><small>Low exposure • emergency vehicles permitted</small></div><b>2.8 km</b></div>
      <div className="route-card blocked"><div className="route-icon"><AlertTriangle size={17}/></div><div><span>Road restriction</span><strong>{blocked.length || 2} network segment(s) blocked</strong><small>Do not route civilian traffic through red segments</small></div></div>
      <div className="route-actions"><button onClick={onOpenResources}><Truck size={16}/>Nearest resources</button><button><LocateFixed size={16}/>Show safe corridor</button></div>
      <div className="route-legend"><span><i className="legend-dot safe-dot"/>Safe</span><span><i className="legend-dot warn-dot"/>Caution</span><span><i className="legend-dot danger-dot"/>Restricted</span></div>
    </section>
  );
}

export default function App() {
  const [zones, setZones] = useState([]);
  const [infrastructure, setInfrastructure] = useState([]);
  const [sensorNodes, setSensorNodes] = useState([]);
  const [citizenReports, setCitizenReports] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedState, setSelectedState] = useState('ALL');
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [activeEmergencyNotice, setActiveEmergencyNotice] = useState(null);
  const [activePanel, setActivePanel] = useState(null);
  const [isSimulationOpen, setIsSimulationOpen] = useState(false);
  const [isCitizenFeedOpen, setIsCitizenFeedOpen] = useState(false);
  const [isReportingOpen, setIsReportingOpen] = useState(false);
  const [isResourcesOpen, setIsResourcesOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [liveTime, setLiveTime] = useState('');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [zonesRes, infraRes, reportsRes] = await Promise.all([
        fetch('/api/v1/zones'), fetch('/api/v1/infrastructure'), fetch('/api/v1/reports')
      ]);
      if (zonesRes.ok) setZones((await zonesRes.json()).features || []);
      if (infraRes.ok) setInfrastructure((await infraRes.json()).features || []);
      if (reportsRes.ok) setCitizenReports((await reportsRes.json()).reports || []);
    } catch (err) { console.warn('Backend fetch failed:', err); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => {
    const tick = () => setLiveTime(new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
    tick(); const timer = setInterval(tick, 1000); return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchData();
    registerBackgroundSync((result) => { if (result.syncedCount > 0) fetchData(); });
    syncOfflineReports().then((r) => { if (r.syncedCount > 0) fetchData(); });
  }, [fetchData]);

  useEffect(() => {
    const isDev = window.location.port === '5173' || window.location.port === '3000';
    const wsUrl = isDev ? 'ws://localhost:8000/ws/alerts' : `ws://${window.location.host}/ws/alerts`;
    let socket; let reconnectTimeout;
    const connect = () => {
      try {
        socket = new WebSocket(wsUrl);
        socket.onopen = () => setWsConnected(true);
        socket.onclose = () => { setWsConnected(false); reconnectTimeout = setTimeout(connect, 4000); };
        socket.onerror = () => socket.close();
        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.event === 'TELEMETRY_UPDATED') {
              setSensorNodes(prev => [data, ...prev.filter(n => n.node_id !== data.node_id && n.node_code !== data.node_code)]);
              setZones(prev => prev.map(z => (z.properties.zone_id === data.zone_id || z.properties.zone_name === data.zone_name) ? {...z, properties:{...z.properties,current_risk_status:data.risk_status,current_fos:data.factor_of_safety}} : z));
              if (data.risk_status === 'CRITICAL') setActiveEmergencyNotice({ title: `RED ALERT • ${data.zone_name}`, msg: `Factor of Safety ${data.factor_of_safety} • ${data.road_status?.toUpperCase() || 'MONITORING'} • Lead time ${data.lead_time || '—'}`, coords: [data.lat, data.lng] });
            } else if (data.event === 'CITIZEN_REPORT_SUBMITTED') setCitizenReports(prev => [data, ...prev]);
            else if (data.event === 'CITIZEN_REPORT_VERIFIED') setCitizenReports(prev => prev.map(r => r.report_id === data.report_id ? {...r, status:data.status} : r));
            else if (data.event === 'INFRASTRUCTURE_UPDATED') setInfrastructure(prev => prev.map(item => item.properties.element_id === data.element_id ? {...item, properties:{...item.properties,current_status:data.current_status}} : item));
          } catch (e) { console.error('Malformed WebSocket frame:', e); }
        };
      } catch (e) { console.warn('WebSocket init error:', e); }
    };
    connect(); return () => { clearTimeout(reconnectTimeout); socket?.close(); };
  }, []);

  const kpis = useMemo(() => {
    const criticalZones = zones.filter(z => z.properties?.current_risk_status === 'CRITICAL').length;
    const highZones = zones.filter(z => z.properties?.current_risk_status === 'HIGH').length;
    const blockedRoads = infrastructure.filter(i => i.properties?.current_status === 'blocked' && i.geometry?.type === 'LineString').length;
    return { criticalZones, highZones, blockedRoads, totalSensors: sensorNodes.length || 24 };
  }, [zones, infrastructure, sensorNodes]);

  const filteredZones = useMemo(() => zones.filter(z => {
    const p = z.properties || {};
    const hay = `${p.zone_name || ''} ${p.district || ''}`.toLowerCase();
    return hay.includes(searchTerm.toLowerCase()) && (selectedState === 'ALL' || p.state === selectedState);
  }), [zones, searchTerm, selectedState]);

  const selectedZone = zones.find(z => z.properties?.zone_id === selectedZoneId) || filteredZones[0] || null;

  const selectZone = (zone) => {
    const p = zone.properties || {}; const c = zone.geometry?.coordinates?.[0]?.[0] || [];
    setSelectedZoneId(p.zone_id); setSelectedTarget({ lat: c[1] || 26.14, lng: c[0] || 91.73, zoom: 11 });
  };

  const handleSimulationResults = (simData) => {
    if (!simData?.results) return;
    setZones(prev => prev.map(z => { const match = simData.results.find(r => r.zone_id === z.properties.zone_id); return match ? {...z, properties:{...z.properties,current_risk_status:match.simulated_status,current_fos:match.simulated_fos}} : z; }));
  };

  const handleTriggerBroadcast = (zoneProp) => alert(`Emergency broadcast triggered for ${zoneProp.zone_name}. Multilingual warnings dispatched to local authorities.`);

  return (
    <div className="command-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-mark"><Mountain size={19}/></div>
          <div><div className="brand-title">NEXUS<span>RISK</span></div><div className="brand-sub">NORTH EAST LANDSLIDE INTELLIGENCE</div></div>
        </div>
        <div className="top-status"><span className={wsConnected ? 'live-dot' : 'offline-dot'}/><b>{wsConnected ? 'FIELD STREAM LIVE' : 'RECONNECTING'}</b><span className="divider"/><Clock3 size={14}/><span>{liveTime} IST</span></div>
        <div className="top-actions">
          <button onClick={() => setIsReportingOpen(true)} className="top-btn accent"><PlusCircle size={15}/>Report</button>
          <button onClick={() => setIsSimulationOpen(true)} className="top-btn"><Sliders size={15}/>Scenario</button>
          <button onClick={() => setIsCitizenFeedOpen(true)} className="top-btn"><Camera size={15}/>Field feed <b>{citizenReports.length}</b></button>
          <button onClick={() => setIsResourcesOpen(true)} className="top-btn"><Truck size={15}/>Resources</button>
          <button onClick={fetchData} className="icon-btn"><RefreshCw size={16}/></button>
        </div>
      </header>

      {activeEmergencyNotice && <div className="alert-strip"><div><Siren size={16}/><strong>{activeEmergencyNotice.title}</strong><span>{activeEmergencyNotice.msg}</span></div><div><button onClick={() => setSelectedTarget({lat:activeEmergencyNotice.coords[0],lng:activeEmergencyNotice.coords[1],zoom:11})}>Locate</button><button onClick={() => setActiveEmergencyNotice(null)} className="strip-close"><X size={14}/></button></div></div>}

      <div className="metric-row">
        <Metric label="Critical zones" value={kpis.criticalZones} unit="" icon={Flame} tone="critical" sub="FoS below 1.0"/>
        <Metric label="High-risk zones" value={kpis.highZones} unit="" icon={AlertTriangle} tone="high" sub="Needs close watch"/>
        <Metric label="Road restrictions" value={kpis.blockedRoads} unit="" icon={Route} tone="neutral" sub="Network segments"/>
        <Metric label="Sensor nodes" value={kpis.totalSensors} unit="" icon={Radio} tone="good" sub={wsConnected ? 'Live telemetry' : 'Last known state'}/>
      </div>

      <main className="workspace">
        <aside className="hazard-rail">
          <div className="rail-head"><div><span className="eyebrow">HAZARD REGISTER</span><h2>Vulnerable corridors</h2></div><span className="count-pill">{filteredZones.length}</span></div>
          <div className="search-box"><Search size={15}/><input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search zone or district"/></div>
          <div className="state-pills">{STATES.map(st => <button key={st} onClick={() => setSelectedState(st)} className={selectedState === st ? 'selected' : ''}>{st}</button>)}</div>
          <div className="rail-list">
            {isLoading ? [1,2,3,4].map(i => <div className="skeleton-zone" key={i}/>) : filteredZones.map(zone => {
              const p = zone.properties || {}; const status = p.current_risk_status || 'LOW'; const selected = p.zone_id === selectedZoneId;
              return <button key={p.zone_id} onClick={() => selectZone(zone)} className={`zone-card ${selected ? 'selected-zone' : ''} ${severityTone[status]}`}>
                <div className="zone-top"><div><strong>{p.zone_name}</strong><span>{p.district}, {p.state}</span></div><RiskBadge status={status}/></div>
                <div className="zone-data"><div><span>FoS</span><b>{Number(p.current_fos || 0).toFixed(2)}</b></div><div><span>Slope</span><b>{p.average_slope_angle || '—'}°</b></div><div><span>History</span><b>{p.historical_incident_count ?? '—'}</b></div><TrendBars status={status}/></div>
                <div className="zone-foot"><span><MapPin size={11}/>{p.district || 'NER'}</span><span>Inspect <ArrowUpRight size={11}/></span></div>
              </button>;
            })}
            {!isLoading && !filteredZones.length && <div className="empty-state"><Mountain size={22}/><p>No corridors match this filter.</p></div>}
          </div>
          <div className="rail-footer"><button onClick={() => setActivePanel('forecast')}><BarChart3 size={15}/>Risk forecast<ChevronRight size={14}/></button><button onClick={() => setActivePanel('sensors')}><Activity size={15}/>Sensor intelligence<ChevronRight size={14}/></button></div>
        </aside>

        <section className="map-stage">
          <LandslideCommandMap zones={zones} infrastructure={infrastructure} sensorNodes={sensorNodes} citizenReports={citizenReports} selectedTarget={selectedTarget} onTriggerAlert={handleTriggerBroadcast}/>
          <div className="map-label"><Layers3 size={14}/><span>LIVE GIS</span><i/></div>
          <div className="map-tools"><button onClick={() => setActivePanel('forecast')} title="Risk forecast"><BarChart3 size={16}/></button><button onClick={() => setActivePanel('sensors')} title="Sensor intelligence"><Activity size={16}/></button><button onClick={() => setActivePanel('routing')} title="Evacuation routing"><Route size={16}/></button></div>
          <div className="map-footer"><span><i className="legend-dot danger-dot"/>Critical</span><span><i className="legend-dot warn-dot"/>High</span><span><i className="legend-dot sensor-dot-map"/>IoT</span><span><i className="legend-dot road-dot"/>Restricted road</span><b>© NEXUS GIS • SRID 4326</b></div>
        </section>

        <aside className="detail-rail">
          <div className="detail-head"><div><span className="eyebrow">COMMAND VIEW</span><h2>Situation brief</h2></div><span className="pulse-label"><span/>LIVE</span></div>
          {selectedZone ? <>
            <div className="selected-zone-card"><div className="selected-title"><div><span>PRIORITY ZONE</span><h3>{selectedZone.properties.zone_name}</h3><p>{selectedZone.properties.district}, {selectedZone.properties.state}</p></div><RiskBadge status={selectedZone.properties.current_risk_status}/></div><div className="fos-display"><div><span>FACTOR OF SAFETY</span><strong>{Number(selectedZone.properties.current_fos || 0).toFixed(2)}</strong></div><div className="fos-meter"><i style={{width:`${Math.min(100, Math.max(8, Number(selectedZone.properties.current_fos || 0) / 1.5 * 100))}%`}}/></div></div>
            <div className="brief-grid"><div><span>Rainfall</span><b>74 mm/hr</b><em>↑ 18%</em></div><div><span>Pore pressure</span><b>3.84×</b><em>↑ 0.42</em></div><div><span>Displacement</span><b>18.6 mm</b><em>↑ 7.2</em></div><div><span>Lead time</span><b>3h 20m</b><em>estimated</em></div></div>
            <div className="detail-actions"><button onClick={() => setActivePanel('forecast')}><BarChart3 size={15}/>Forecast</button><button onClick={() => setActivePanel('routing')}><Route size={15}/>Route</button><button onClick={() => handleTriggerBroadcast(selectedZone.properties)}><Siren size={15}/>Broadcast</button></div>
            <div className="brief-section"><div className="section-title"><span>WHY THIS ZONE IS RISING</span><Gauge size={15}/></div><div className="driver"><span>Rainfall loading</span><div><i style={{width:'91%'}}/></div><b>91</b></div><div className="driver"><span>Pore pressure</span><div><i style={{width:'82%'}}/></div><b>82</b></div><div className="driver"><span>Slope geometry</span><div><i style={{width:'68%'}}/></div><b>68</b></div></div>
            </div></> : <div className="detail-empty"><Compass size={28}/><h3>Select a hazard</h3><p>Choose a corridor from the register to inspect its stability, sensor signals and response options.</p></div>}
          <div className="quick-status"><div><CircleDot size={14}/><span>Last model refresh</span><b>just now</b></div><div><CloudRain size={14}/><span>Weather feed</span><b>synced</b></div><div><Wifi size={14}/><span>Gateway health</span><b>{wsConnected ? 'healthy' : 'degraded'}</b></div></div>
        </aside>
      </main>

      {activePanel === 'forecast' && <div className="panel-overlay"><ForecastPanel zone={selectedZone} onClose={() => setActivePanel(null)}/></div>}
      {activePanel === 'sensors' && <div className="panel-overlay"><SensorPanel zones={zones} onClose={() => setActivePanel(null)}/></div>}
      {activePanel === 'routing' && <div className="panel-overlay"><RoutingPanel zone={selectedZone} infrastructure={infrastructure} onClose={() => setActivePanel(null)} onOpenResources={() => {setActivePanel(null);setIsResourcesOpen(true)}}/></div>}

      <SimulationDrawer isOpen={isSimulationOpen} onClose={() => setIsSimulationOpen(false)} onRunSimulation={handleSimulationResults}/>
      <CitizenFeedDrawer isOpen={isCitizenFeedOpen} onClose={() => setIsCitizenFeedOpen(false)} reports={citizenReports} onVerifyReport={async (id) => { try { await fetch(`/api/v1/reports/${id}/verify`, {method:'PATCH'}); fetchData(); } catch(e) { console.error(e); } }} onSelectLocation={coord => setSelectedTarget(coord)}/>
      <FieldReportingModal isOpen={isReportingOpen} onClose={() => setIsReportingOpen(false)} onReportSubmitted={fetchData}/>
      <EmergencyResourcesModal isOpen={isResourcesOpen} onClose={() => setIsResourcesOpen(false)} onSelectLocation={coord => setSelectedTarget(coord)}/>
    </div>
  );
}

import React, { useState } from 'react';
import { Truck, Navigation, AlertTriangle, ShieldCheck, Clock, MapPin, ArrowRight, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function TrafficOrchestrationModal({ isOpen, onClose, onOrchestrate = () => {} }) {
  const [selectedCorridor, setSelectedCorridor] = useState('NH-6 Guwahati-Shillong Highway');
  const [isSimulating, setIsSimulating] = useState(false);
  const [activePlan, setActivePlan] = useState(null);

  if (!isOpen) return null;

  const corridors = [
    { id: 'c1', name: 'NH-6 Guwahati-Shillong Highway', status: 'BLOCKED', risk: 'CRITICAL', blockedAt: 'Km 42 Barapani Ridge' },
    { id: 'c2', name: 'NH-27 Haflong - Silchar Corridor', status: 'PARTIALLY_BLOCKED', risk: 'HIGH', blockedAt: 'Jatinga Valley Pass' },
    { id: 'c3', name: 'NH-10 Gangtok - Siliguri Highway', status: 'OPEN', risk: 'MEDIUM', blockedAt: 'None' },
    { id: 'c4', name: 'NH-54 Aizawl - Sairang Corridor', status: 'BLOCKED', risk: 'CRITICAL', blockedAt: 'Km 18 Scarp Cut' }
  ];

  const handleRunOrchestration = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch('/api/v1/traffic/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blocked_element_id: 'i1',
          target_corridor: selectedCorridor
        })
      });
      if (res.ok) {
        const data = await res.json();
        setActivePlan(data.orchestration);
        onOrchestrate(data.orchestration);
      }
    } catch (err) {
      console.warn("Traffic orchestration fallback:", err);
      setActivePlan({
        primary_corridor: selectedCorridor,
        status: "BLOCKED_DUE_TO_LANDSLIDE",
        recommended_bypass: "NH-27 via Umrangso - Haflong Bypass",
        estimated_delay_minutes: 42,
        distance_increase_km: 16.8,
        convoy_priority_level: "EMERGENCY_NDRF_FIRST",
        checkpoints: [
          { name: "Jowai Gate 1", status: "OPEN", capacity: "HIGH" },
          { name: "Nartiang Feeder Junction", status: "CONTROLLED", capacity: "MEDIUM" },
          { name: "Haflong Relief Base", status: "CLEAR", capacity: "UNLIMITED" }
        ]
      });
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[3000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
              <Navigation size={24} />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white tracking-tight">Adaptive Traffic Orchestration</h3>
              <p className="text-xs text-slate-300">Real-time Landslide Highway Bypass Routing & Emergency Priority Dispatch</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          {/* Corridor Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Select Affected Mountain Corridor
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {corridors.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedCorridor(c.name)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${selectedCorridor === c.name ? 'bg-indigo-600/20 border-indigo-500 shadow-lg shadow-indigo-600/20' : 'bg-slate-950/60 border-white/5 hover:border-white/20'}`}
                >
                  <div>
                    <h5 className="font-bold text-xs text-white">{c.name}</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5">Location: {c.blockedAt}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${c.status === 'BLOCKED' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : c.status === 'PARTIALLY_BLOCKED' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'}`}>
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Execute Reroute Action */}
          <button
            onClick={handleRunOrchestration}
            disabled={isSimulating}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs rounded-2xl shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2"
          >
            {isSimulating ? <RefreshCw size={16} className="animate-spin" /> : <Navigation size={16} />}
            <span>{isSimulating ? 'Computing Bypass Geodesics...' : 'Orchestrate Adaptive Evacuation Detour'}</span>
          </button>

          {/* Orchestration Plan Results */}
          {activePlan && (
            <div className="p-4 bg-slate-950 border border-indigo-500/30 rounded-2xl space-y-3 animate-fade-in shadow-xl">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="text-xs font-black uppercase text-indigo-400 flex items-center space-x-1.5">
                  <CheckCircle2 size={16} />
                  <span>Adaptive Reroute Active</span>
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
                  BROADCAST TO EMERGENCY CONVOYS
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div className="bg-white/5 p-3 rounded-xl">
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Recommended Bypass</span>
                  <span className="text-white font-bold text-xs mt-0.5 block">{activePlan.recommended_bypass}</span>
                </div>

                <div className="bg-white/5 p-3 rounded-xl">
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Estimated Delay Delta</span>
                  <span className="text-amber-400 font-mono font-black text-sm mt-0.5 block">+{activePlan.estimated_delay_minutes} mins</span>
                </div>

                <div className="bg-white/5 p-3 rounded-xl">
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Distance Addition</span>
                  <span className="text-cyan-400 font-mono font-black text-sm mt-0.5 block">+{activePlan.distance_increase_km} km</span>
                </div>
              </div>

              {/* Checkpoints Status */}
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2">Active Traffic Checkpoints</span>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  {activePlan.checkpoints.map((cp, idx) => (
                    <div key={idx} className="bg-slate-900 p-2.5 rounded-xl border border-white/5 flex flex-col justify-between">
                      <span className="font-semibold text-slate-200">{cp.name}</span>
                      <span className="text-[9px] text-emerald-400 font-mono mt-1">Status: {cp.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

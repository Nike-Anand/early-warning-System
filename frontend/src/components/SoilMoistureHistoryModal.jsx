import React, { useState, useEffect } from 'react';
import { CloudRain, Activity, TrendingUp, AlertTriangle, Calendar, Layers, RefreshCw, BarChart2 } from 'lucide-react';

export default function SoilMoistureHistoryModal({ isOpen, onClose }) {
  const [days, setDays] = useState(7);
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/v1/telemetry/historical?days=${days}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.warn("Historical telemetry fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, [isOpen, days]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[3000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-2xl border border-blue-500/30">
              <CloudRain size={24} />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white tracking-tight">Historical Rainfall & Soil Moisture Analytics</h3>
              <p className="text-xs text-slate-300">Continuous Hydro-Geotechnical Telemetry & Saturation Trends</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Range Selector Bar */}
        <div className="p-4 bg-slate-950/70 border-b border-white/5 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Analytics Window:</span>
            {[3, 7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${days === d ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-slate-900 text-slate-400 border border-white/5 hover:bg-white/5'}`}
              >
                {d} Days
              </button>
            ))}
          </div>

          {data && (
            <div className="text-[11px] text-slate-400 font-mono">
              Critical $I_{{crit}}$ Breach Threshold: <span className="text-rose-400 font-bold">{data.critical_threshold_mm_hr} mm/hr</span>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5 overflow-y-auto custom-scrollbar flex-1">
          {isLoading ? (
            <div className="py-20 text-center space-y-3">
              <RefreshCw size={28} className="animate-spin text-blue-400 mx-auto" />
              <p className="text-xs text-slate-400">Loading historical hydro-geotechnical dataset...</p>
            </div>
          ) : data ? (
            <>
              {/* Summary Metrics Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-white/5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Peak Soil Moisture</span>
                  <span className="text-blue-400 font-mono text-lg font-black mt-0.5 block">94.8% Saturation</span>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-2xl border border-white/5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Pore Water Pressure (u)</span>
                  <span className="text-amber-400 font-mono text-lg font-black mt-0.5 block">44.2 kPa</span>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-2xl border border-white/5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Max Rainfall Rate</span>
                  <span className="text-cyan-400 font-mono text-lg font-black mt-0.5 block">58.0 mm/hr</span>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-2xl border border-white/5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Min Factor of Safety</span>
                  <span className="text-rose-400 font-mono text-lg font-black mt-0.5 block">0.85 (Failure)</span>
                </div>
              </div>

              {/* Time Series Visual Curve Table */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2 text-xs font-bold text-slate-300">
                  <span className="flex items-center space-x-2">
                    <BarChart2 size={16} className="text-blue-400" />
                    <span>Hydro-Geotechnical Time Series Stream ({data.total_data_points} Samples)</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">WGS84 Partitioned Time Ledger</span>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                  {data.historical_series.map((item, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-900/80 rounded-xl border border-white/5 flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center space-x-3 w-1/4">
                        <span className="text-slate-400 font-bold text-[11px]">{item.timestamp_offset}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase ${item.threshold_breach ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-emerald-500/20 text-emerald-300'}`}>
                          {item.threshold_breach ? 'BREACH' : 'NORMAL'}
                        </span>
                      </div>

                      {/* Soil Moisture Bar */}
                      <div className="w-1/3 flex items-center space-x-2">
                        <span className="text-[10px] text-slate-400 w-12">Soil:</span>
                        <div className="flex-1 bg-slate-950 h-2 rounded-full overflow-hidden border border-white/10">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full"
                            style={{ width: `${item.soil_moisture_percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-[11px] text-slate-200 w-12 text-right">{item.soil_moisture_percentage}%</span>
                      </div>

                      {/* FoS Status */}
                      <div className="w-1/4 text-right">
                        <span className="text-[10px] text-slate-400 mr-2">FoS:</span>
                        <span className={`font-black ${item.factor_of_safety < 1.0 ? 'text-rose-400' : item.factor_of_safety < 1.3 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {item.factor_of_safety}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center text-xs text-slate-400 py-10">No historical dataset available.</div>
          )}
        </div>
      </div>
    </div>
  );
}

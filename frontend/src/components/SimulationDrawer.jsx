import React, { useState } from 'react';
import { CloudRain, Play, RotateCcw, AlertOctagon, TrendingDown, CheckCircle2, ChevronRight } from 'lucide-react';

export default function SimulationDrawer({ isOpen, onClose, onRunSimulation }) {
  const [rainDelta, setRainDelta] = useState(30); // mm/hr added
  const [duration, setDuration] = useState(12);   // hours
  const [poreMultiplier, setPoreMultiplier] = useState(2.2);
  const [loading, setLoading] = useState(false);
  const [simulationResults, setSimulationResults] = useState(null);

  if (!isOpen) return null;

  const handleSimulate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/simulation/what-if', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rainfall_intensity_delta_mm_hr: parseFloat(rainDelta),
          duration_hours: parseFloat(duration),
          pore_pressure_multiplier: parseFloat(poreMultiplier)
        })
      });
      const data = await res.json();
      setSimulationResults(data);
      if (onRunSimulation) {
        onRunSimulation(data);
      }
    } catch (e) {
      console.error("Simulation failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setRainDelta(0);
    setDuration(24);
    setPoreMultiplier(1.0);
    setSimulationResults(null);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-[2000] w-96 bg-slate-900/95 backdrop-blur-xl border-l border-slate-800 shadow-2xl flex flex-col transition-all duration-300">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-indigo-600/30 text-indigo-400 rounded-lg">
            <CloudRain size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-100">"What-If" Climate Simulator</h3>
            <p className="text-[11px] text-slate-400">Stress-test NER slopes under heavy downpours</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
        >
          ✕
        </button>
      </div>

      {/* Controls Container */}
      <div className="p-5 space-y-5 flex-1 overflow-y-auto custom-scrollbar">
        {/* Slider 1: Rainfall Intensity Delta */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-300 font-medium">Excess Rainfall Intensity:</span>
            <b className="text-indigo-400 font-mono">+{rainDelta} mm/hr</b>
          </div>
          <input
            type="range"
            min="0"
            max="80"
            step="5"
            value={rainDelta}
            onChange={(e) => setRainDelta(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>+0 mm/hr (Dry)</span>
            <span>+40 mm/hr (Heavy)</span>
            <span>+80 mm/hr (Cloudburst)</span>
          </div>
        </div>

        {/* Slider 2: Duration */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-300 font-medium">Downpour Continuous Duration:</span>
            <b className="text-indigo-400 font-mono">{duration} Hours</b>
          </div>
          <input
            type="range"
            min="1"
            max="48"
            step="1"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>1 hr (Flash)</span>
            <span>24 hrs (Full Day)</span>
            <span>48 hrs (Prolonged)</span>
          </div>
        </div>

        {/* Slider 3: Groundwater Pore Pressure */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-300 font-medium">Pore Water Pressure Spike:</span>
            <b className="text-amber-400 font-mono">{poreMultiplier}x</b>
          </div>
          <input
            type="range"
            min="1.0"
            max="4.0"
            step="0.2"
            value={poreMultiplier}
            onChange={(e) => setPoreMultiplier(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>1.0x (Normal)</span>
            <span>2.5x (High Saturation)</span>
            <span>4.0x (Severe Hydrostatic)</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-2 pt-2">
          <button
            onClick={handleSimulate}
            disabled={loading}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center justify-center space-x-2 transition-all shadow-lg shadow-indigo-600/30"
          >
            <Play size={14} />
            <span>{loading ? 'Executing Physics Engine...' : 'Run Simulation'}</span>
          </button>
          <button
            onClick={handleReset}
            className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl flex items-center justify-center transition-colors"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        {/* Results Stream */}
        {simulationResults && (
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs font-bold text-slate-200">
              <span>Simulation Diagnostics</span>
              <span className="px-2 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded text-[10px]">
                {simulationResults.escalated_zones_count} Zones Escalated
              </span>
            </div>

            <div className="space-y-2">
              {simulationResults.results?.map((res) => (
                <div
                  key={res.zone_id}
                  className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-200">{res.zone_name.split('(')[0]}</span>
                    <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded ${res.simulated_status === 'CRITICAL' ? 'bg-rose-500 text-white' : res.simulated_status === 'HIGH' ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'}`}>
                      {res.simulated_status}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Baseline FoS: <b className="text-slate-300">{res.baseline_fos}</b></span>
                    <span className="text-rose-400">Simulated FoS: <b>{res.simulated_fos}</b></span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-snug">{res.diagnosis}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

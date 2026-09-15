import React, { useState } from 'react';
import { Wind, Eye, Compass, ShieldAlert, CloudRain, RefreshCw, Zap, Play, Pause, Layers } from 'lucide-react';

export default function HurricaneTrackerModal({ isOpen, onClose, onSelectLocation = () => {} }) {
  const [activeTab, setActiveTab] = useState('sat_live');
  const [isPlaying, setIsPlaying] = useState(true);

  if (!isOpen) return null;

  const stormMetrics = {
    name: 'CYCLONE REMAL / BAY OF BENGAL SYSTEM',
    category: 'CATEGORY 2 - SEVERE CYCLONIC STORM',
    windSpeed: '125 km/h',
    gusts: '155 km/h',
    centralPressure: '978 hPa',
    movement: 'NNE at 16 km/h',
    landingEst: 'Meghalaya / Assam Hills in 14 hours',
    coordinates: { lat: 24.8, lng: 91.5 }
  };

  const satelliteFeeds = [
    {
      id: 'insat3d',
      title: 'INSAT-3D Infrared Live Feed (NER & Bay of Bengal)',
      agency: 'ISRO / MOSDAC',
      timestamp: 'Live (Updated 5m ago)',
      url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80',
      badge: 'HIGH RESOLUTION IR'
    },
    {
      id: 'himawari8',
      title: 'Himawari-8 Geo-Color Atmospheric Stream',
      agency: 'JMA / NOAA',
      timestamp: 'Live (Updated 10m ago)',
      url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1000&q=80',
      badge: 'GEO-COLOR MULTI-SPECTRAL'
    },
    {
      id: 'doppler_radar',
      title: 'IMD Shillong Live Doppler Weather Radar (Composite Reflectivity)',
      agency: 'India Meteorological Department',
      timestamp: 'Realtime Radar Feed',
      url: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=1000&q=80',
      badge: 'DOPPLER RADAR dBZ'
    }
  ];

  return (
    <div className="fixed inset-0 z-[3000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-cyan-950 via-slate-900 to-indigo-950 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-cyan-500/20 text-cyan-400 rounded-2xl border border-cyan-500/30">
              <Wind size={24} className="animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-lg text-white tracking-tight">Hurricane & Cyclone Tracker</h3>
                <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                  ACTIVE STORM ADVISORY
                </span>
              </div>
              <p className="text-xs text-slate-300">Live Satellite Infrared Feeds & IMD Doppler Radar Stream</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Storm Overview Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-slate-950/70 border-b border-white/5 text-xs">
          <div className="bg-slate-900/80 p-3 rounded-2xl border border-white/5">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Central Wind Speed</span>
            <span className="text-cyan-400 font-mono text-base font-black flex items-center space-x-1 mt-0.5">
              <Wind size={15} />
              <span>{stormMetrics.windSpeed}</span>
            </span>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-2xl border border-white/5">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Central Pressure</span>
            <span className="text-amber-400 font-mono text-base font-black flex items-center space-x-1 mt-0.5">
              <Zap size={15} />
              <span>{stormMetrics.centralPressure}</span>
            </span>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-2xl border border-white/5">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Movement Trajectory</span>
            <span className="text-indigo-300 font-mono text-xs font-bold mt-1 block">
              {stormMetrics.movement}
            </span>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-2xl border border-white/5 flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Landfall Estimate</span>
            <span className="text-rose-400 font-semibold text-xs mt-0.5">
              {stormMetrics.landingEst}
            </span>
          </div>
        </div>

        {/* Live Satellite Gallery Content */}
        <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-300 flex items-center space-x-2">
              <Layers size={14} className="text-cyan-400" />
              <span>Live Satellite & Doppler Feeds ({satelliteFeeds.length})</span>
            </h4>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-3 py-1 bg-white/5 hover:bg-white/10 text-slate-300 text-xs rounded-xl font-semibold flex items-center space-x-1.5 border border-white/10"
              >
                {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                <span>{isPlaying ? 'Pause Loop' : 'Play Loop'}</span>
              </button>
              <button
                onClick={() => onSelectLocation({ lat: stormMetrics.coordinates.lat, lng: stormMetrics.coordinates.lng, zoom: 8 })}
                className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs rounded-xl font-bold transition-all shadow-md shadow-cyan-600/30"
              >
                Center Map on Storm
              </button>
            </div>
          </div>

          {/* Feeds Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {satelliteFeeds.map((feed) => (
              <div key={feed.id} className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden flex flex-col group hover:border-cyan-500/50 transition-all shadow-lg">
                <div className="relative h-48 bg-slate-900 overflow-hidden">
                  <img
                    src={feed.url}
                    alt={feed.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md px-2 py-1 rounded-lg text-[9px] font-mono text-cyan-300 font-bold border border-cyan-500/30">
                    {feed.badge}
                  </div>
                  {isPlaying && (
                    <div className="absolute bottom-2 right-2 bg-emerald-500/90 text-white px-2 py-0.5 rounded text-[9px] font-bold flex items-center space-x-1 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                      <span>LIVE STREAM</span>
                    </div>
                  )}
                </div>
                <div className="p-3 space-y-1.5 flex-1 flex flex-col justify-between">
                  <div>
                    <h5 className="font-bold text-xs text-white line-clamp-1">{feed.title}</h5>
                    <p className="text-[10px] text-slate-400">{feed.agency} &bull; {feed.timestamp}</p>
                  </div>
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Resolution: 500m Sub-Satellite</span>
                    <span className="text-cyan-400 font-bold group-hover:underline">View HD Frame</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Safety Advisory Banner */}
          <div className="p-4 bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-transparent border border-amber-500/30 rounded-2xl text-xs space-y-1.5">
            <div className="flex items-center space-x-2 text-amber-300 font-bold">
              <ShieldAlert size={16} />
              <span>CYCLONIC RAINFALL LANDSLIDE ADVISORY</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Feeder rainbands from Cyclone System are causing cloudburst intensity ($>65 \text{{ mm/hr}}$) across Shillong Ridge, Haflong Pass, and Sohra slopes. Soil moisture saturation has reached 94.8%. High risk of debris flow on mountain highways.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

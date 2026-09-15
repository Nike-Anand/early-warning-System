import React, { useState, useEffect } from 'react';
import { Truck, Users, Phone, MapPin, CheckCircle, Clock, Shield } from 'lucide-react';

export default function EmergencyResourcesModal({ isOpen, onClose, onSelectLocation = () => {} }) {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/v1/emergency/resources')
        .then(r => r.json())
        .then(d => {
          setResources(d.resources || []);
          setLoading(false);
        })
        .catch(err => {
          console.error("Resource fetch failed:", err);
          setLoading(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getTypeBadge = (type) => {
    switch (type) {
      case 'NDRF_BATTALION':
        return <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded text-[10px] font-bold">NDRF Battalion</span>;
      case 'SDRF_TEAM':
        return <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-bold">SDRF Unit</span>;
      case 'HEAVY_EXCAVATOR':
        return <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded text-[10px] font-bold">Heavy Machinery (BRO)</span>;
      default:
        return <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold">Relief Camp</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-[3000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl">
              <Truck size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100">Disaster Management & Emergency Resources</h3>
              <p className="text-xs text-slate-400">Rapid deployment status across North Eastern corridors</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Resources Grid */}
        <div className="p-5 space-y-3 overflow-y-auto custom-scrollbar flex-1">
          {loading ? (
            <div className="text-center py-10 text-slate-500 text-xs">Loading emergency assets...</div>
          ) : resources.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">No emergency resources registered.</div>
          ) : (
            resources.map((res) => (
              <div
                key={res.resource_id}
                className="p-4 bg-slate-950 border border-slate-800 rounded-xl hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-bold text-xs text-slate-100">{res.resource_name}</h4>
                    {getTypeBadge(res.unit_type)}
                  </div>
                  <p className="text-xs text-slate-400">
                    Station: <span className="text-slate-300 font-medium">{res.stationed_location}</span>
                  </p>
                  <div className="flex items-center space-x-4 text-[11px] text-slate-400">
                    <span className="flex items-center space-x-1">
                      <Users size={12} className="text-indigo-400" />
                      <span>{res.personnel_count} Personnel</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Shield size={12} className="text-emerald-400" />
                      <span>Officer: {res.contact_officer}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <a
                    href={`tel:${res.contact_phone}`}
                    className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
                  >
                    <Phone size={12} />
                    <span>Call Hotline</span>
                  </a>
                  <button
                    onClick={() => {
                      onSelectLocation({ lat: res.lat, lng: res.lon, zoom: 12 });
                      onClose();
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
                  >
                    <MapPin size={12} />
                    <span>Locate</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

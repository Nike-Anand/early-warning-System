import React, { useState } from 'react';
import { Camera, CheckCircle, Clock, MapPin, AlertTriangle, ShieldCheck, ExternalLink } from 'lucide-react';

export default function CitizenFeedDrawer({
  isOpen,
  onClose,
  reports = [],
  onVerifyReport = () => {},
  onDeleteReport = () => {},
  onSelectLocation = () => {},
   t = (key) => key
}) {
  const [filter, setFilter] = useState('ALL');

  if (!isOpen) return null;

  const filteredReports = reports.filter(r => {
    if (filter === 'PENDING') return r.status === 'pending';
    if (filter === 'VERIFIED') return r.status === 'verified';
    return true;
  });

  return (
    <div className="fixed inset-y-0 right-0 z-[2000] w-[420px] bg-slate-900/95 backdrop-blur-xl border-l border-slate-800 shadow-2xl flex flex-col transition-all duration-300">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg">
            <Camera size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-100">→ {t('citizen_crowdsourced_feed')}</h3>
            <p className="text-[11px] text-slate-400">→ {t('realtime_ground_reports')}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
        >
          ✕
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-950/60 flex space-x-2">
        {['ALL', 'PENDING', 'VERIFIED'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${filter === tab ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* List Feed */}
      <div className="p-4 space-y-3.5 flex-1 overflow-y-auto custom-scrollbar">
        {filteredReports.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            → {t('no_matching_reports')}

          </div>
        ) : (
          filteredReports.map((report) => {
            const isVerified = report.status === 'verified';
            const lat = report.latitude || report.lat;
            const lon = report.longitude || report.lng;

            return (
              <div
                key={report.report_id || report.offline_sync_id}
                className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl hover:border-slate-700 transition-all space-y-2.5 shadow-sm"
              >
                {/* Title & Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-amber-400 font-bold text-xs uppercase tracking-wide">
                      {report.category?.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-slate-500">• {report.severity_estimate || 'HIGH'}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isVerified ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}
                  >
                    {report.status || 'Pending'}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-300 leading-relaxed">
                  {report.landmark_description || report.description}
                </p>

                {/* Multimedia preview */}
                {report.multimedia_url && (
                  <div className="relative rounded-lg overflow-hidden border border-slate-800 max-h-36">
                    <img
                      src={report.multimedia_url}
                      alt="Incident evidence"
                      className="w-full h-32 object-cover"
                    />
                    <a
                      href={report.multimedia_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute bottom-1.5 right-1.5 p-1 bg-black/60 hover:bg-black text-white rounded text-[10px] flex items-center space-x-1 backdrop-blur-sm"
                    >
                      <ExternalLink size={10} />
                      <span>→ {t('full_photo')}</span>
                    </a>
                  </div>
                )}

                {/* Meta & Location Button */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                  <button
                    onClick={() => onSelectLocation({ lat, lng: lon, zoom: 12 })}
                    className="flex items-center space-x-1 text-indigo-400 hover:text-indigo-300 font-medium"
                  >
                    <MapPin size={12} />
                    <span>{lat?.toFixed(2)}°N, {lon?.toFixed(2)}°E</span>
                  </button>

                  <span className="text-[10px] text-slate-500">
                    → {t('by')}{report.reporter_name || `→ ${t('anonymous')}`}
                  </span>
                </div>

                {/* Official Action: Verify & Delete */}
                <div className="flex space-x-2 mt-2">
                  {!isVerified && (
                    <button
                      onClick={() => onVerifyReport(report.id || report.report_id)}
                      className="flex-1 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
                    >
                      <ShieldCheck size={14} />
                      <span>→ {t('verify_official_map')}</span>
                    </button>
                  )}
                  <button
                    onClick={() => onDeleteReport(report.id || report.report_id)}
                    className={`${isVerified ? 'w-full' : 'w-auto px-3'} py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors`}
                    title="Remove from system"
                  >
                    <span>✕ {isVerified ? t('remove') : ''}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

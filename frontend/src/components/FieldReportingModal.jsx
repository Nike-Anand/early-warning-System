import React, { useState, useEffect } from 'react';
import { Camera, MapPin, Upload, WifiOff, CheckCircle, AlertTriangle, Crosshair } from 'lucide-react';
import { saveOfflineReport } from '../utils/indexedDbSync';

export default function FieldReportingModal({ isOpen, onClose, onReportSubmitted = () => {} }) {
  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');
  const [category, setCategory] = useState('GROUND_CRACK');
  const [severity, setSeverity] = useState('HIGH');
  const [lat, setLat] = useState('25.710');
  const [lng, setLng] = useState('91.820');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusNotice, setStatusNotice] = useState(null);

  if (!isOpen) return null;

  const handleCaptureGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude.toFixed(4));
          setLng(pos.coords.longitude.toFixed(4));
        },
        (err) => {
          console.warn("GPS error:", err);
          // Fallback to Meghalaya coordinates
          setLat('25.712');
          setLng('91.825');
        }
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusNotice(null);

    const reportPayload = {
      reporter_name: reporterName || 'Field Officer / Citizen',
      reporter_phone: reporterPhone,
      category,
      severity_estimate: severity,
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
      landmark_description: description,
      multimedia_url: photoUrl || 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80'
    };

    try {
      if (!navigator.onLine) {
        // Device is offline -> Store in IndexedDB
        await saveOfflineReport(reportPayload);
        setStatusNotice({
          type: 'offline',
          msg: '🌐 You are offline! Report stored safely in IndexedDB queue. It will automatically upload upon reconnection.'
        });
        setTimeout(() => {
          onReportSubmitted(reportPayload);
          onClose();
        }, 2200);
      } else {
        // Device is online -> Submit directly to API
        const res = await fetch('/api/v1/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reportPayload)
        });

        if (res.ok) {
          setStatusNotice({
            type: 'success',
            msg: '✅ Incident report submitted and broadcast to MDoNER Command Center!'
          });
          setTimeout(() => {
            onReportSubmitted(reportPayload);
            onClose();
          }, 1500);
        } else {
          throw new Error('Server returned non-200');
        }
      }
    } catch (error) {
      console.warn("Direct upload failed, saving to IndexedDB:", error);
      await saveOfflineReport(reportPayload);
      setStatusNotice({
        type: 'offline',
        msg: '📦 Connection hiccup. Report saved to local offline queue.'
      });
      setTimeout(() => {
        onReportSubmitted(reportPayload);
        onClose();
      }, 2000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[3000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <Camera size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100">Submit Geo-Tagged Incident</h3>
              <p className="text-xs text-slate-400">Offline-first crowd-sourcing & field reporting</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          {statusNotice && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center space-x-2 ${statusNotice.type === 'offline' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}
            >
              {statusNotice.type === 'offline' ? <WifiOff size={16} /> : <CheckCircle size={16} />}
              <span>{statusNotice.msg}</span>
            </div>
          )}

          {/* Incident Category & Severity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Incident Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="GROUND_CRACK">Ground / Slope Crack</option>
                <option value="ROCKFALL">Rockfall / Debris Fall</option>
                <option value="MUDSLIDE">Mudslide / Slump</option>
                <option value="ROAD_BLOCKAGE">Highway Blockage</option>
                <option value="SUBSIDENCE">Road Subsidence</option>
                <option value="WATER_SURGE">Pore Water / Spring Surge</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Estimated Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="LOW">Low (Minor Surface Shift)</option>
                <option value="MEDIUM">Medium (Cautionary)</option>
                <option value="HIGH">High (Active Movement)</option>
                <option value="CRITICAL">Critical (Immediate Hazard)</option>
              </select>
            </div>
          </div>

          {/* GPS Coordinates Capture */}
          <div className="space-y-1">
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-300">Geo-Coordinates (WGS84)</label>
              <button
                type="button"
                onClick={handleCaptureGPS}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 font-semibold"
              >
                <Crosshair size={12} />
                <span>Auto-Detect GPS</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Latitude (e.g. 25.710)"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
              />
              <input
                type="text"
                placeholder="Longitude (e.g. 91.820)"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Landmark & Physical Observations
            </label>
            <textarea
              rows="3"
              placeholder="Describe road milepost, crack width (cm), continuous seepage, or trapped vehicles..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 placeholder-slate-600"
            ></textarea>
          </div>

          {/* Photo Evidence URL */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Photo Evidence Link</label>
            <div className="flex space-x-2">
              <input
                type="url"
                placeholder="https://image-upload.domain/sample.jpg"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 placeholder-slate-600"
              />
              <button
                type="button"
                onClick={() => setPhotoUrl('https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80')}
                className="px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl font-medium"
              >
                Sample Photo
              </button>
            </div>
          </div>

          {/* Reporter Details */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <input
              type="text"
              placeholder="Your Name (Optional)"
              value={reporterName}
              onChange={(e) => setReporterName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 placeholder-slate-600"
            />
            <input
              type="tel"
              placeholder="Mobile Number"
              value={reporterPhone}
              onChange={(e) => setReporterPhone(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 placeholder-slate-600"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-800 flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-1.5"
            >
              <Upload size={14} />
              <span>{isSubmitting ? 'Syncing...' : 'Submit Report'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

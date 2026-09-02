import React, { useEffect, useRef } from 'react';
import { Viewer, Entity, PointGraphics, PolylineGraphics } from 'resium';
import { Cartesian3, Color } from 'cesium';
import { ShieldAlert } from 'lucide-react';

export default function LandslideCommandMap({
  zones = [],
  infrastructure = [],
  sensorNodes = [],
  citizenReports = [],
  selectedTarget = null,
  onTriggerAlert = () => {}
}) {
  const viewerRef = useRef(null);

  // Risk Color Mapper for Cesium
  const getRiskColor = (status, alpha = 1.0) => {
    switch (status) {
      case 'CRITICAL': return Color.fromCssColorString('#EF4444').withAlpha(alpha);
      case 'HIGH': return Color.fromCssColorString('#F97316').withAlpha(alpha);
      case 'MEDIUM': return Color.fromCssColorString('#EAB308').withAlpha(alpha);
      default: return Color.fromCssColorString('#22C55E').withAlpha(alpha);
    }
  };

  useEffect(() => {
    if (viewerRef.current?.cesiumElement) {
      const viewer = viewerRef.current.cesiumElement;
      if (selectedTarget) {
        viewer.camera.flyTo({
          destination: Cartesian3.fromDegrees(selectedTarget.lng, selectedTarget.lat, 80000.0)
        });
      } else {
        // Default view: North Eastern Region (Guwahati)
        viewer.camera.flyTo({
          destination: Cartesian3.fromDegrees(91.73, 26.14, 800000.0)
        });
      }
    }
  }, [selectedTarget]);

  return (
    <div className="relative h-full w-full bg-slate-950">
      <Viewer
        ref={viewerRef}
        full
        timeline={false}
        animation={false}
        infoBox={true}
        homeButton={false}
        navigationHelpButton={false}
        geocoder={false}
        sceneModePicker={false}
        baseLayerPicker={true}
        style={{ width: '100%', height: '100%' }}
      >
        {/* Render IoT Telemetry Slope Stations */}
        {sensorNodes.map((node) => {
          const lat = node.lat || 25.75;
          const lon = node.lon || 91.88;
          const status = node.risk_status || 'LOW';

          const descriptionHtml = `
            <div style="font-family: sans-serif; color: white;">
              <p><b>Soil Moisture:</b> ${node.soil_moisture || 35.0}%</p>
              <p><b>Pore Pressure:</b> ${node.pore_pressure || 4.2} kPa</p>
              <p><b>Factor of Safety:</b> ${node.factor_of_safety || 1.65}</p>
            </div>
          `;

          return (
            <Entity
              key={node.node_id || node.node_code}
              position={Cartesian3.fromDegrees(lon, lat)}
              name={node.node_name || node.node_code}
              description={descriptionHtml}
            >
              <PointGraphics pixelSize={18} color={getRiskColor(status)} outlineColor={Color.WHITE} outlineWidth={2} />
            </Entity>
          );
        })}

        {/* Render Crowd-Sourced Citizen Reports */}
        {citizenReports.map((rep) => {
          const lat = rep.latitude || rep.lat;
          const lon = rep.longitude || rep.lng || rep.lon;
          if (!lat || !lon) return null;

          const status = rep.severity_estimate || rep.severity;

          return (
            <Entity
              key={rep.report_id || rep.offline_sync_id}
              position={Cartesian3.fromDegrees(lon, lat)}
              name={`Citizen Report: ${rep.category}`}
              description={rep.landmark_description || rep.description}
            >
              <PointGraphics pixelSize={14} color={getRiskColor(status)} outlineColor={Color.YELLOW} outlineWidth={2} />
            </Entity>
          );
        })}
      </Viewer>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-6 left-6 z-[1000] bg-slate-900/90 backdrop-blur-md p-3.5 rounded-xl border border-slate-800 shadow-2xl text-xs space-y-2 max-w-[210px]">
        <div className="font-bold text-slate-200 uppercase tracking-wider text-[10px] flex items-center justify-between">
          <span>3D Globe Legend</span>
          <ShieldAlert size={14} className="text-indigo-400" />
        </div>
        <div className="space-y-1.5 text-[11px]">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded bg-hazard-critical shadow-[0_0_8px_#ef4444]"></span>
            <span className="text-slate-300 font-medium">Critical (FoS &lt; 1.0)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded bg-hazard-high"></span>
            <span className="text-slate-300 font-medium">High Risk Sector</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded bg-hazard-medium"></span>
            <span className="text-slate-300 font-medium">Medium Advisory</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded bg-hazard-low"></span>
            <span className="text-slate-300 font-medium">Low / Stable Slope</span>
          </div>
        </div>
      </div>
    </div>
  );
}

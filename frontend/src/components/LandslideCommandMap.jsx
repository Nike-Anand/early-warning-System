import React, { useEffect, useRef, useMemo, useState } from 'react';
import { Viewer, Entity, PointGraphics, GeoJsonDataSource } from 'resium';
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
  const [nasaEvents, setNasaEvents] = useState([]);

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
    const fetchNasaEvents = async () => {
      try {
        // Fetch live severe storms and floods from NASA
        const response = await fetch('https://eonet.gsfc.nasa.gov/api/v3/events?category=landslides,severeStorms,floods&status=open&limit=40');
        const data = await response.json();
        setNasaEvents(data.events || []);
      } catch (error) {
        console.error('Failed to fetch NASA EONET events:', error);
      }
    };
    fetchNasaEvents();
  }, []);

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

  // Create a stable GeoJSON object for the zones
  const geojsonData = useMemo(() => {
    return { type: 'FeatureCollection', features: zones };
  }, [zones]);

  const handleGeoJsonLoad = (dataSource) => {
    const entities = dataSource.entities.values;
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      // Get the risk status from the GeoJSON properties
      const status = entity.properties?.current_risk_status?.getValue() || 'LOW';
      const name = entity.properties?.zone_name?.getValue() || 'Zone';
      const fos = entity.properties?.current_fos?.getValue() || 'N/A';
      
      entity.name = name;
      entity.description = `
        <div style="font-family: sans-serif; color: white;">
          <p><b>Risk Status:</b> ${status}</p>
          <p><b>Factor of Safety:</b> ${fos}</p>
        </div>
      `;

      const color = getRiskColor(status, 0.45);
      if (entity.polygon) {
        entity.polygon.material = color;
        entity.polygon.outline = true;
        entity.polygon.outlineColor = getRiskColor(status, 1.0);
        entity.polygon.extrudedHeight = 0; // Drape over terrain if enabled
      } else if (entity.point || entity.billboard) {
        // Fallback if the zone is somehow a point
        entity.point = {
          pixelSize: 20,
          color: getRiskColor(status, 1.0),
          outlineColor: Color.WHITE,
          outlineWidth: 2
        };
      }
    }
  };

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
        {/* Render the 8 Vulnerable Zones from the Sidebar */}
        {zones.length > 0 && (
          <GeoJsonDataSource data={geojsonData} onLoad={handleGeoJsonLoad} />
        )}

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

        {/* Render NASA EONET Live Events */}
        {nasaEvents.map((event) => {
          // Take the most recent geometry point
          const geom = event.geometry && event.geometry.length > 0 ? event.geometry[event.geometry.length - 1] : null;
          if (!geom || geom.type !== 'Point') return null;
          
          const [lon, lat] = geom.coordinates;
          const category = event.categories && event.categories.length > 0 ? event.categories[0].title : 'Unknown Event';
          
          const descriptionHtml = `
            <div style="font-family: sans-serif; color: white;">
              <p><b>NASA Category:</b> ${category}</p>
              <p><b>Reported Date:</b> ${new Date(geom.date).toLocaleString()}</p>
              <p><b>Source:</b> NASA EONET</p>
            </div>
          `;

          return (
            <Entity
              key={event.id}
              position={Cartesian3.fromDegrees(lon, lat)}
              name={event.title}
              description={descriptionHtml}
            >
              <PointGraphics 
                pixelSize={16} 
                color={Color.fromCssColorString('#D946EF')} // Neon purple
                outlineColor={Color.WHITE} 
                outlineWidth={2} 
              />
            </Entity>
          );
        })}
      </Viewer>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-6 left-6 z-[1000] bg-slate-900/90 backdrop-blur-md p-3.5 rounded-xl border border-slate-800 shadow-2xl text-xs space-y-2 max-w-[220px]">
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
          <div className="flex items-center space-x-2 mt-2 pt-2 border-t border-slate-700">
            <span className="w-3 h-3 rounded bg-fuchsia-500 shadow-[0_0_8px_#d946ef]"></span>
            <span className="text-slate-200 font-bold">NASA Live Global Event</span>
          </div>
        </div>
      </div>
    </div>
  );
}

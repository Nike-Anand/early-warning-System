import React, { useEffect, useRef, useMemo, useState } from 'react';
import { Viewer, Entity, PointGraphics, GeoJsonDataSource, ImageryLayer } from 'resium';
import { Cartesian3, Color, ScreenSpaceEventHandler, ScreenSpaceEventType, Math as CesiumMath, UrlTemplateImageryProvider, Ion } from 'cesium';
import { ShieldAlert, Wind } from 'lucide-react';

// Suppress the default Ion token warning since we are using a custom imagery provider
Ion.defaultAccessToken = '';

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
  
  // Custom Hover Tooltip State
  const [hoverInfo, setHoverInfo] = useState({ visible: false, x: 0, y: 0, lat: 0, lon: 0, windSpeed: 0, windDir: 'N' });

  // RainViewer Radar Time State
  const [radarPath, setRadarPath] = useState(null);

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
        const response = await fetch('https://eonet.gsfc.nasa.gov/api/v3/events?category=landslides,severeStorms,floods&status=open&limit=40');
        const data = await response.json();
        setNasaEvents(data.events || []);
      } catch (error) {
        console.error('Failed to fetch NASA EONET events:', error);
      }
    };
    fetchNasaEvents();

    // Fetch latest RainViewer timestamp for live rain precipitation overlay
    const fetchRainViewerTime = async () => {
      try {
        const response = await fetch('https://api.rainviewer.com/public/weather-maps.json');
        const data = await response.json();
        if (data && data.radar && data.radar.past && data.radar.past.length > 0) {
          const latest = data.radar.past[data.radar.past.length - 1];
          // Use color scheme 2 (Zoom Earth style)
          setRadarPath(`${data.host}${latest.path}/256/{z}/{x}/{y}/2/1_1.png`);
        }
      } catch (error) {
        console.error('Failed to fetch RainViewer data:', error);
      }
    };
    fetchRainViewerTime();
  }, []);

  useEffect(() => {
    if (viewerRef.current?.cesiumElement) {
      const viewer = viewerRef.current.cesiumElement;
      
      // 1. Enable Night Boundary (Dynamic Lighting)
      viewer.scene.globe.enableLighting = true;
      
      // Ensure dark space background (remove sky atmosphere for dramatic space look)
      viewer.scene.skyAtmosphere.show = true;
      viewer.scene.skyAtmosphere.hueShift = -0.5;
      viewer.scene.skyAtmosphere.saturationShift = -0.2;
      viewer.scene.skyAtmosphere.brightnessShift = -0.2;

      // 2. Map Movement tracking
      if (selectedTarget) {
        viewer.camera.flyTo({
          destination: Cartesian3.fromDegrees(selectedTarget.lng, selectedTarget.lat, 80000.0)
        });
      } else {
        // Default view: North Eastern Region
        viewer.camera.flyTo({
          destination: Cartesian3.fromDegrees(91.73, 26.14, 1200000.0)
        });
      }

      // 3. ScreenSpaceEventHandler for Mouse Hover (Wind Speed Tooltip)
      const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
      handler.setInputAction((movement) => {
        // Get earth coordinate under mouse
        const ray = viewer.camera.getPickRay(movement.endPosition);
        const position = viewer.scene.globe.pick(ray, viewer.scene);
        
        if (position) {
          const cartographic = viewer.scene.globe.ellipsoid.cartesianToCartographic(position);
          const lon = CesiumMath.toDegrees(cartographic.longitude);
          const lat = CesiumMath.toDegrees(cartographic.latitude);
          
          // Generate a pseudo-random but stable wind speed based on coordinates
          const windSpeed = Math.floor(Math.abs(Math.sin(lat * lon)) * 40 + 5);
          const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
          const windDir = dirs[Math.floor(Math.abs(Math.cos(lat * lon)) * 8) % 8];

          setHoverInfo({
            visible: true,
            x: movement.endPosition.x,
            y: movement.endPosition.y,
            lat: lat.toFixed(2),
            lon: lon.toFixed(2),
            windSpeed,
            windDir
          });
        } else {
          setHoverInfo(prev => ({ ...prev, visible: false }));
        }
      }, ScreenSpaceEventType.MOUSE_MOVE);

      return () => {
        if (!handler.isDestroyed()) handler.destroy();
      };
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
        entity.polygon.extrudedHeight = 0;
      }
    }
  };

  // Base imagery: CartoDB Dark Matter (Sleek dark mode base map, no API key required)
  const darkMapImagery = new UrlTemplateImageryProvider({
    url: 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    maximumLevel: 19,
    credit: 'CartoDB'
  });

  return (
    <div className="relative h-full w-full bg-black">
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
        baseLayerPicker={false}
        imageryProvider={darkMapImagery}
        style={{ width: '100%', height: '100%' }}
      >
        {/* Dynamic Weather Radar Layer (RainViewer) */}
        {radarPath && (
          <ImageryLayer
            alpha={0.75}
            imageryProvider={new UrlTemplateImageryProvider({
              url: radarPath,
              credit: 'RainViewer',
              maximumLevel: 10
            })}
          />
        )}

        {/* Render the 8 Vulnerable Zones from the Sidebar */}
        {zones.length > 0 && (
          <GeoJsonDataSource data={geojsonData} onLoad={handleGeoJsonLoad} />
        )}

        {/* Render IoT Telemetry Slope Stations */}
        {sensorNodes.map((node) => {
          const lat = node.lat || 25.75;
          const lon = node.lon || 91.88;
          const status = node.risk_status || 'LOW';

          return (
            <Entity
              key={node.node_id || node.node_code}
              position={Cartesian3.fromDegrees(lon, lat)}
              name={node.node_name || node.node_code}
              description="Sensor Node Data"
            >
              <PointGraphics pixelSize={18} color={getRiskColor(status)} outlineColor={Color.WHITE} outlineWidth={2} />
            </Entity>
          );
        })}

        {/* Render NASA EONET Live Events */}
        {nasaEvents.map((event) => {
          const geom = event.geometry && event.geometry.length > 0 ? event.geometry[event.geometry.length - 1] : null;
          if (!geom || geom.type !== 'Point') return null;
          const [lon, lat] = geom.coordinates;
          return (
            <Entity
              key={event.id}
              position={Cartesian3.fromDegrees(lon, lat)}
              name={event.title}
              description="NASA Severe Storm"
            >
              <PointGraphics 
                pixelSize={16} 
                color={Color.fromCssColorString('#D946EF')} 
                outlineColor={Color.WHITE} 
                outlineWidth={2} 
              />
            </Entity>
          );
        })}
      </Viewer>

      {/* Floating Wind Cursor Tooltip (Zoom Earth Style) */}
      {hoverInfo.visible && (
        <div 
          className="absolute z-[2000] pointer-events-none transform -translate-x-1/2 -translate-y-[150%] transition-opacity duration-75"
          style={{ left: hoverInfo.x, top: hoverInfo.y }}
        >
          <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-lg shadow-2xl p-2 flex items-center space-x-3 text-white">
            <div className="flex items-center space-x-1.5 font-bold text-sm">
              <span className="text-white drop-shadow-md">{hoverInfo.windSpeed} km/h</span>
              <Wind size={14} className="text-indigo-300 ml-1" />
              <span className="text-indigo-400 font-black">{hoverInfo.windDir}</span>
            </div>
            <div className="border-l border-white/20 pl-2 text-[10px] text-slate-400 font-mono flex flex-col">
              <span>{hoverInfo.lat}° N</span>
              <span>{hoverInfo.lon}° E</span>
            </div>
            
            {/* Downward pointing triangle for tooltip */}
            <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full border-[6px] border-transparent border-t-slate-900/80"></div>
          </div>
        </div>
      )}

      {/* Map Legend Overlay */}
      <div className="absolute bottom-6 left-6 z-[1000] bg-black/50 backdrop-blur-xl p-3.5 rounded-2xl border border-white/10 shadow-2xl text-xs space-y-2 max-w-[220px]">
        <div className="font-bold text-slate-300 uppercase tracking-widest text-[10px] flex items-center justify-between drop-shadow-sm">
          <span>3D Globe Legend</span>
          <ShieldAlert size={14} className="text-indigo-400" />
        </div>
        <div className="space-y-2 text-[11px] pt-1">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_8px_#ef4444]"></span>
            <span className="text-slate-200 font-medium drop-shadow-sm">Critical Sector</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-amber-500"></span>
            <span className="text-slate-200 font-medium drop-shadow-sm">High Risk</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-fuchsia-500 shadow-[0_0_8px_#d946ef]"></span>
            <span className="text-slate-200 font-medium drop-shadow-sm">NASA Weather Alert</span>
          </div>
          <div className="flex items-center space-x-2 border-t border-white/10 pt-2">
            <div className="w-full h-2 rounded bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 opacity-80"></div>
          </div>
          <div className="text-[9px] text-slate-400 text-center uppercase font-bold tracking-widest">
            Live Rain Radar
          </div>
        </div>
      </div>
    </div>
  );
}

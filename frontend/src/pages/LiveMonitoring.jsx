import React, { useEffect, useMemo, useState, useRef } from 'react';
import { MapContainer, Marker, TileLayer, Polyline, Tooltip, Popup, ZoomControl, ScaleControl, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

import {
  Activity, Cloud, Compass, Gauge, Plane, RefreshCw, Wind,
  Search, X, Navigation, Thermometer, CloudRain, Droplets, Filter, AlertTriangle,
  MapPin, ChevronDown, ChevronRight, Info, Clock, AlertCircle, Maximize
} from 'lucide-react';
import { getLiveAircraft, getLiveWeather, getLiveDashboard, predictRouteDeviation, getLiveRoute } from '../services/api';

// Create a custom SVG icon for aircraft that we can rotate and animate smoothly
const createAircraftIcon = (heading = 0, color = '#22d3ee') => {
  return L.divIcon({
    html: `
      <div style="transform: rotate(${heading}deg) scale(var(--marker-scale, 1)); width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; opacity: 0.85;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" stroke="#0f172a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6">
          <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.2-1.1.6L3 8l6 5.3L6 17l-3-1-2 1.5 4 3.5 3.5 4 1.5-2-1-3 3.7-3 5.3 6h1.2c.4-.2.7-.6.6-1.1z"/>
        </svg>
      </div>
    `,
    className: 'leaflet-aircraft-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

const createAirportIcon = () => {
  return L.divIcon({
    html: `
      <div style="width: 16px; height: 16px; background-color: white; border: 2px solid #334155; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
        <div style="width: 6px; height: 6px; background-color: #3b82f6; border-radius: 50%;"></div>
      </div>
    `,
    className: 'leaflet-airport-marker',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8],
  });
};

// Component to handle auto-zooming and dynamic marker scaling
const MapController = ({ aircrafts, resetTrigger }) => {
  const map = useMap();
  const initialized = useRef(false);

  useEffect(() => {
    if (aircrafts.length > 0 && (!initialized.current || resetTrigger > 0)) {
      initialized.current = true;
      const validPoints = aircrafts.filter(a => a.latitude && a.longitude).map(a => [a.latitude, a.longitude]);
      if (validPoints.length > 0) {
        const bounds = L.latLngBounds(validPoints);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 });
      }
    }
  }, [aircrafts, map, resetTrigger]);

  useMapEvents({
    zoom: () => {
      const zoom = map.getZoom();
      // Dynamic marker size: smaller when zoomed out, larger when zoomed in
      const scale = Math.max(0.5, Math.min(1.2, zoom / 6));
      document.documentElement.style.setProperty('--marker-scale', scale);
    }
  });

  return null;
};

// Component to show mouse coordinates
const MouseCoordinates = () => {
  const [coords, setCoords] = useState({ lat: 0, lng: 0 });
  const map = useMap();
  
  useEffect(() => {
    const handleMouseMove = (e) => {
      setCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
    };
    map.on('mousemove', handleMouseMove);
    return () => map.off('mousemove', handleMouseMove);
  }, [map]);
  
  return (
    <div className="absolute bottom-1 right-1 z-[400] bg-slate-900/80 px-2 py-1 rounded text-[9px] font-mono text-slate-400 pointer-events-none border border-slate-800">
      {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
    </div>
  );
};

// Animated Marker Component with React.memo for performance
const AnimatedAircraftMarker = React.memo(({ aircraft, color, isSelected, onClick }) => {
  const markerRef = useRef(null);
  const prevPos = useRef([aircraft.latitude, aircraft.longitude]);

  useEffect(() => {
    if (markerRef.current) {
      const marker = markerRef.current;
      const startLat = prevPos.current[0];
      const startLng = prevPos.current[1];
      const endLat = aircraft.latitude;
      const endLng = aircraft.longitude;

      if (startLat !== endLat || startLng !== endLng) {
        let startTime = null;
        const duration = 29000; // Animate over 29 seconds for 30s interval
        let animationFrameId;

        const animate = (timestamp) => {
          if (!startTime) startTime = timestamp;
          const progress = Math.min((timestamp - startTime) / duration, 1);
          
          const currentLat = startLat + (endLat - startLat) * progress;
          const currentLng = startLng + (endLng - startLng) * progress;
          
          if (marker.setLatLng) {
             marker.setLatLng([currentLat, currentLng]);
          }
          
          if (progress < 1) {
            animationFrameId = requestAnimationFrame(animate);
          } else {
            prevPos.current = [endLat, endLng];
          }
        };
        animationFrameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrameId);
      }
    }
  }, [aircraft.latitude, aircraft.longitude]);

  return (
    <Marker
      ref={markerRef}
      position={prevPos.current}
      icon={createAircraftIcon(aircraft.heading || 0, color)}
      eventHandlers={{ click: () => onClick(aircraft) }}
      zIndexOffset={isSelected ? 1000 : 0}
    >
      <Popup className="custom-popup" autoPan={false}>
        <div className="font-sans min-w-[200px]">
          <div className="font-bold text-slate-800 text-sm mb-1">{aircraft.callsign || 'UNKNOWN'}</div>
          <div className="text-xs text-slate-600 mb-2 border-b pb-2">{aircraft.origin_country || 'Unknown'}</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-slate-400">Alt:</span> {Math.round(aircraft.altitude || 0)}ft</div>
            <div><span className="text-slate-400">Spd:</span> {Math.round(aircraft.velocity || 0)}kt</div>
            <div><span className="text-slate-400">Hdg:</span> {Math.round(aircraft.heading || 0)}°</div>
            <div><span className="text-slate-400">VR:</span> {aircraft.vertical_rate?.toFixed(1) || 0}</div>
          </div>
        </div>
      </Popup>
      <Tooltip direction="top" offset={[0, -10]} className="custom-tooltip bg-transparent border-none shadow-none" opacity={1}>
        <div className="font-mono text-[10px] bg-slate-900/80 backdrop-blur border border-slate-700 text-slate-200 px-2 py-1 rounded shadow-lg whitespace-nowrap">
          {aircraft.callsign || aircraft.icao24}
        </div>
      </Tooltip>
    </Marker>
  );
});

export default function LiveMonitoring({ showNotification }) {
  const abortControllerRef = useRef(null);
  const isFetchingRef = useRef(false);
  const [aircrafts, setAircrafts] = useState([]);
  const [flightPaths, setFlightPaths] = useState({});
  const [weatherCache, setWeatherCache] = useState({});
  const [resetViewTrigger, setResetViewTrigger] = useState(0);
  
  const [selectedAircraft, setSelectedAircraft] = useState(null);
  const [weather, setWeather] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [predicting, setPredicting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [debugError, setDebugError] = useState(null);
  
  // Accordion state
  const [expandedSections, setExpandedSections] = useState({
    flight: true,
    route: true,
    weather: true,
    prediction: true
  });
  
  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };
  
  const [stats, setStats] = useState({
    total_live_aircraft: 0,
    average_speed: 0,
    average_altitude: 0,
    average_wind_speed: 0,
    weather_severity: 'Low',
    last_updated: null,
  });

  const [filters, setFilters] = useState({
    search: '',
    minAlt: '',
    maxAlt: '',
    minSpeed: '',
    maxSpeed: '',
    airline: '',
    country: '',
    showDelayed: false,
    showHighRisk: false,
    weatherSeverity: 'All',
    maxAircraft: '300'
  });
  
  const [showFilters, setShowFilters] = useState(false);

  const loadData = async (initial = false) => {
    if (isFetchingRef.current && !initial) return;
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    isFetchingRef.current = true;

    if (initial) setLoading(true);
    else setRefreshing(true);

    try {
      const [aircraftResult, dashboardResult] = await Promise.allSettled([
        getLiveAircraft(true, abortControllerRef.current.signal),
        getLiveDashboard(abortControllerRef.current.signal)
      ]);

      let newAircrafts = [];
      if (aircraftResult.status === 'fulfilled' && aircraftResult.value) {
        newAircrafts = aircraftResult.value.aircrafts || [];
        console.log("Aircraft received:", newAircrafts.length);
        if (newAircrafts.length > 0) {
          console.log("First aircraft from API:", newAircrafts[0]);
        }
        setAircrafts(newAircrafts);
        
        setFlightPaths(prev => {
          const next = { ...prev };
          newAircrafts.forEach(ac => {
            if (ac.latitude && ac.longitude) {
              const currentPath = prev[ac.icao24] || [];
              const lastPos = currentPath[currentPath.length - 1];
              if (!lastPos || lastPos[0] !== ac.latitude || lastPos[1] !== ac.longitude) {
                next[ac.icao24] = [...currentPath, [ac.latitude, ac.longitude]];
              } else {
                next[ac.icao24] = [...currentPath];
              }
            }
          });
          return next;
        });

        if (selectedAircraft) {
          setAircrafts(current => {
             const updated = current.find(a => a.icao24 === selectedAircraft.icao24);
             if (updated) setSelectedAircraft(updated);
             return current;
          });
        }
      } else {
        console.error("Aircraft fetch failed:", aircraftResult.reason);
      }
      
      if (dashboardResult.status === 'fulfilled' && dashboardResult.value) {
        console.log("Raw backend dashboard response:", dashboardResult.value);
        const dashboardData = dashboardResult.value;
        setStats({
          total_live_aircraft: dashboardData.total_live_aircraft || newAircrafts.length,
          average_speed: dashboardData.average_speed || 0,
          average_altitude: dashboardData.average_altitude || 0,
          average_wind_speed: dashboardData.average_wind_speed || 0,
          weather_severity: dashboardData.weather_severity || 'Low',
          last_updated: dashboardData.last_updated || new Date().toISOString()
        });
      }

    } catch (error) {
      if (error.name === 'CanceledError' || error.name === 'AbortError') return;
      console.error('Failed to load live monitoring data:', error);
      setDebugError(error.toString() + (error.stack ? '\\n' + error.stack : ''));
    } finally {
      setLoading(false);
      setRefreshing(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    loadData(true);
    const intervalId = setInterval(() => loadData(false), 15000);
    return () => clearInterval(intervalId);
  }, []);

  const handleAircraftSelect = async (aircraft) => {
    setSelectedAircraft(aircraft);
    setPrediction(null);
    setRouteInfo(null);
    setPredicting(true);
    
    if (weatherCache[aircraft.icao24]) {
      setWeather(weatherCache[aircraft.icao24]);
    } else {
      setWeather(null);
    }
    
    try {
      const [routeResult, weatherResult, predResult] = await Promise.allSettled([
        getLiveRoute(aircraft.callsign || aircraft.icao24, undefined),
        !weatherCache[aircraft.icao24] ? getLiveWeather(aircraft.icao24) : Promise.resolve({ cached: true }),
        predictRouteDeviation(aircraft.icao24)
      ]);
      
      if (routeResult.status === 'fulfilled') {
        setRouteInfo(routeResult.value);
      } else {
        setRouteInfo({ error: true });
      }
      
      if (weatherResult.status === 'fulfilled' && weatherResult.value && !weatherResult.value.cached && weatherResult.value.weather) {
        setWeather(weatherResult.value.weather);
        setWeatherCache(prev => ({ ...prev, [aircraft.icao24]: weatherResult.value.weather }));
      }
      
      if (predResult.status === 'fulfilled') {
        setPrediction(predResult.value);
      } else {
        // Extract actual error message from Axios
        const errMsg = predResult.reason?.response?.data?.detail || predResult.reason?.message || 'Unknown error';
        setPrediction({ error: true, message: errMsg });
      }
    } catch (error) {
      console.error("Parallel fetch failed", error);
    } finally {
      setPredicting(false);
    }
  };

  const closePanel = () => {
    setSelectedAircraft(null);
    setWeather(null);
    setPrediction(null);
    setRouteInfo(null);
  };

  const getMarkerColor = (icao24) => {
    const w = weatherCache[icao24];
    if (!w) return '#22d3ee';
    const isSevere = w.wind_speed > 25 || w.visibility < 1000;
    const isModerate = w.wind_speed > 15 || w.visibility < 3000;
    if (isSevere) return '#f43f5e';
    if (isModerate) return '#fbbf24';
    return '#10b981';
  };

  const visibleAircrafts = useMemo(() => {
    const filtered = aircrafts.filter((ac) => {
      if (ac.latitude == null || ac.longitude == null || isNaN(ac.latitude) || isNaN(ac.longitude)) return false;
      const s = filters.search.toLowerCase();
      const matchSearch = !s || 
        (ac.callsign && ac.callsign.toLowerCase().includes(s)) || 
        (ac.icao24 && ac.icao24.toLowerCase().includes(s)) ||
        (ac.origin_country && ac.origin_country.toLowerCase().includes(s));
      const matchAlt = (!filters.minAlt || ac.altitude >= Number(filters.minAlt)) &&
                       (!filters.maxAlt || ac.altitude <= Number(filters.maxAlt));
      const matchSpeed = (!filters.minSpeed || ac.velocity >= Number(filters.minSpeed)) &&
                         (!filters.maxSpeed || ac.velocity <= Number(filters.maxSpeed));
      const matchCountry = !filters.country || (ac.origin_country && ac.origin_country.toLowerCase().includes(filters.country.toLowerCase()));
      
      // High risk / Delayed mock logic (since we only know prediction after click, we approximate for filter or check cache if available)
      if (filters.showHighRisk) {
         // mock filter: high risk if alt < 10000 or velocity < 100
         if (ac.altitude > 10000 && ac.velocity > 200) return false;
      }
      return matchSearch && matchAlt && matchSpeed && matchCountry;
    });
    let result = filtered;
    if (filters.maxAircraft !== 'All') {
      const max = parseInt(filters.maxAircraft, 10);
      result = filtered.slice(0, max);
    }
    console.log("Aircraft after filtering:", result.length);
    return result;
  }, [aircrafts, filters]);

  if (loading && aircrafts.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <Plane className="w-12 h-12 text-cyan-500 animate-bounce" />
          <div className="text-cyan-400 font-mono text-sm tracking-widest animate-pulse">ESTABLISHING SATELLITE UPLINK...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden font-sans">
      <div className="absolute inset-0 z-0">
        <MapContainer 
          center={[20, 0]} 
          zoom={3} 
          minZoom={2}
          scrollWheelZoom={true}
          doubleClickZoom={true}
          dragging={true}
          touchZoom={true}
          keyboard={true}
          className="h-full w-full bg-[#090d16]"
          zoomControl={false}
        >
          <MapController aircrafts={visibleAircrafts} resetTrigger={resetViewTrigger} />
          <ZoomControl position="bottomright" />
          <ScaleControl position="bottomleft" imperial={true} metric={true} />
          <MouseCoordinates />
          
          <TileLayer
            attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          
          {/* Render individual non-clustered polylines outside the ClusterGroup */}
          {visibleAircrafts.map((ac) => {
            const color = getMarkerColor(ac.icao24);
            const path = flightPaths[ac.icao24] || [];
            const isSelected = selectedAircraft?.icao24 === ac.icao24;
            
            return (
              <React.Fragment key={'paths-' + ac.icao24}>
                {path.length > 1 && (
                  <Polyline 
                    positions={path} 
                    color={color} 
                    weight={isSelected ? 3 : 2} 
                    opacity={isSelected ? 0.8 : 0.4} 
                    dashArray="4"
                  />
                )}
                
                {isSelected && routeInfo && !routeInfo.error && routeInfo.origin_lat && routeInfo.destination_lat && (
                  <>
                    <Marker position={[routeInfo.origin_lat, routeInfo.origin_lon]} icon={createAirportIcon()}>
                      <Tooltip direction="top" offset={[0, -10]}>{routeInfo.origin_iata} - {routeInfo.origin_airport}</Tooltip>
                    </Marker>
                    <Marker position={[routeInfo.destination_lat, routeInfo.destination_lon]} icon={createAirportIcon()}>
                      <Tooltip direction="top" offset={[0, -10]}>{routeInfo.destination_iata} - {routeInfo.destination_airport}</Tooltip>
                    </Marker>
                    
                    <Polyline 
                      positions={[
                        [routeInfo.origin_lat, routeInfo.origin_lon], 
                        [ac.latitude, ac.longitude]
                      ]} 
                      color="#10b981" 
                      weight={2} 
                      opacity={0.6}
                    />
                    <Polyline 
                      positions={[
                        [ac.latitude, ac.longitude], 
                        [routeInfo.destination_lat, routeInfo.destination_lon]
                      ]} 
                      color="#3b82f6" 
                      weight={2} 
                      opacity={0.6}
                      dashArray="5, 5"
                    />
                  </>
                )}
              </React.Fragment>
            );
          })}
          {/* Temporarily disabled clustering for debugging */}
          <React.Fragment>
            {visibleAircrafts.map((ac) => (
              <AnimatedAircraftMarker 
                key={ac.icao24}
                aircraft={ac}
                color={getMarkerColor(ac.icao24)}
                isSelected={selectedAircraft?.icao24 === ac.icao24}
                onClick={handleAircraftSelect}
              />
            ))}
          </React.Fragment>
          
        </MapContainer>
      </div>

      <div className="absolute top-4 left-4 right-[420px] z-[100] flex flex-col gap-2 pointer-events-none transition-all duration-300">
        <div className="flex items-center justify-between pointer-events-auto">
          <div className="glass-panel px-4 py-2.5 rounded-2xl flex items-center gap-6 shadow-2xl">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-cyan-400 animate-spin-slow" />
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Airway Monitor</div>
                <div className="text-sm font-bold text-white font-heading">LIVE TELEMETRY</div>
              </div>
            </div>
            <div className="h-6 w-px bg-slate-700"></div>
            <div className="flex items-center gap-6">
              <StatItem icon={<Plane />} label="Active" value={stats.total_live_aircraft} />
              <StatItem icon={<Gauge />} label="Avg Speed" value={`${Math.round(stats.average_speed)} kts`} />
              <StatItem icon={<Navigation />} label="Avg Alt" value={`${Math.round(stats.average_altitude)} ft`} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setResetViewTrigger(prev => prev + 1)}
              className="glass-panel p-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors tooltip-trigger"
              title="Reset View to Bounds"
            >
              <Maximize className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`glass-panel p-2.5 rounded-xl transition-colors hover:bg-slate-800 ${showFilters ? 'bg-slate-800 border-cyan-500/50 text-cyan-400' : 'text-slate-300'}`}
              title="Toggle Filters"
            >
              <Filter className="w-5 h-5" />
            </button>
            <button 
              onClick={() => loadData(false)}
              disabled={refreshing}
              className="glass-panel p-2.5 rounded-xl text-slate-300 hover:text-white transition-colors"
              title="Manual Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="glass-panel p-4 rounded-2xl w-full max-w-2xl self-end shadow-2xl pointer-events-auto animate-fade-in border border-slate-700/50">
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-4 sm:col-span-2">
                <label className="text-[10px] font-mono text-slate-400 uppercase mb-1 block">Search Callsign/ICAO</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input type="text" value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} placeholder="Search..." className="w-full bg-slate-900/50 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"/>
                </div>
              </div>
              <div className="col-span-4 sm:col-span-2">
                <label className="text-[10px] font-mono text-slate-400 uppercase mb-1 block">Country Origin</label>
                <input type="text" value={filters.country} onChange={e => setFilters({...filters, country: e.target.value})} placeholder="E.g. United States" className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"/>
              </div>
              <div className="col-span-4 sm:col-span-2">
                <label className="text-[10px] font-mono text-slate-400 uppercase mb-1 block">Altitude Range (ft)</label>
                <div className="flex items-center gap-2">
                  <input type="number" placeholder="Min" value={filters.minAlt} onChange={e => setFilters({...filters, minAlt: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"/>
                  <span className="text-slate-500">-</span>
                  <input type="number" placeholder="Max" value={filters.maxAlt} onChange={e => setFilters({...filters, maxAlt: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"/>
                </div>
              </div>
              <div className="col-span-4 sm:col-span-2">
                <label className="text-[10px] font-mono text-slate-400 uppercase mb-1 block">Speed Range (kts)</label>
                <div className="flex items-center gap-2">
                  <input type="number" placeholder="Min" value={filters.minSpeed} onChange={e => setFilters({...filters, minSpeed: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"/>
                  <span className="text-slate-500">-</span>
                  <input type="number" placeholder="Max" value={filters.maxSpeed} onChange={e => setFilters({...filters, maxSpeed: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"/>
                </div>
              </div>
              <div className="col-span-4 flex items-center gap-6 mt-2 border-t border-slate-700/50 pt-3">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={filters.showDelayed} onChange={e => setFilters({...filters, showDelayed: e.target.checked})} className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-cyan-500" />
                  Show Delayed Only
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={filters.showHighRisk} onChange={e => setFilters({...filters, showHighRisk: e.target.checked})} className="rounded bg-slate-900 border-slate-700 text-orange-500 focus:ring-orange-500" />
                  Show High-Risk Only
                </label>
                <div className="flex items-center gap-2 ml-auto">
                  <label className="text-xs text-slate-400">Max Display:</label>
                  <select 
                    value={filters.maxAircraft} 
                    onChange={e => setFilters({...filters, maxAircraft: e.target.value})}
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                  >
                    <option value="300">300</option>
                    <option value="500">500</option>
                    <option value="1000">1000</option>
                    <option value="All">All</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={`absolute top-0 right-0 h-full w-[400px] glass-panel border-l border-slate-800/80 z-[200] transform transition-transform duration-300 ease-in-out flex flex-col shadow-2xl ${selectedAircraft ? 'translate-x-0' : 'translate-x-full'}`}>
        {selectedAircraft && (
          <>
            <div className="flex items-center justify-between p-4 border-b border-slate-800/60 bg-slate-900/80 backdrop-blur-md sticky top-0 z-10">
              <div>
                <h2 className="text-lg font-bold text-white font-heading">{selectedAircraft.callsign || 'UNKNOWN CALLSIGN'}</h2>
                <div className="text-xs text-cyan-400 font-mono">ICAO: {selectedAircraft.icao24}</div>
              </div>
              <button onClick={closePanel} className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar pb-20">
              
              {/* FLIGHT INFORMATION */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
                <button onClick={() => toggleSection('flight')} className="w-full p-3 flex items-center justify-between bg-slate-900/60 hover:bg-slate-800/80 transition-colors">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2"><Plane className="w-4 h-4 text-cyan-500" /> Flight Information</span>
                  {expandedSections.flight ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                </button>
                {expandedSections.flight && (
                  <div className="p-3 grid grid-cols-2 gap-2 border-t border-slate-800">
                    <InfoCell label="Origin Country" value={selectedAircraft.origin_country || 'Unknown'} />
                    <InfoCell label="Airline" value={routeInfo?.airline || 'Unknown'} />
                    <InfoCell label="Flight Number" value={routeInfo?.flight_number || selectedAircraft.callsign || 'Unknown'} />
                    <InfoCell label="Aircraft Model" value={routeInfo?.aircraft_model || 'Unknown'} />
                    <InfoCell label="Registration" value={routeInfo?.aircraft_registration || 'Unknown'} />
                    <InfoCell label="Status" value={routeInfo?.flight_status || 'In Air'} highlight />
                    <InfoCell label="Latitude" value={selectedAircraft.latitude?.toFixed(4)} />
                    <InfoCell label="Longitude" value={selectedAircraft.longitude?.toFixed(4)} />
                    <InfoCell label="Altitude" value={`${Math.round(selectedAircraft.altitude || 0)} ft`} />
                    <InfoCell label="Speed" value={`${Math.round(selectedAircraft.velocity || 0)} kts`} />
                    <InfoCell label="Heading" value={`${Math.round(selectedAircraft.heading || 0)}°`} />
                    <InfoCell label="Vertical Rate" value={`${selectedAircraft.vertical_rate?.toFixed(1) || 0} m/s`} />
                  </div>
                )}
              </div>

              {/* ROUTE INFORMATION */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
                <button onClick={() => toggleSection('route')} className="w-full p-3 flex items-center justify-between bg-slate-900/60 hover:bg-slate-800/80 transition-colors">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2"><MapPin className="w-4 h-4 text-emerald-500" /> Route Visualization</span>
                  {expandedSections.route ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                </button>
                {expandedSections.route && (
                  <div className="p-3 border-t border-slate-800">
                    {!routeInfo ? (
                       <div className="flex items-center gap-2 text-xs text-slate-500"><RefreshCw className="w-3 h-3 animate-spin"/> Resolving Flight Path...</div>
                    ) : routeInfo.error ? (
                       <div className="flex items-center gap-2 text-xs text-slate-500"><AlertCircle className="w-3 h-3"/> Real route information unavailable</div>
                    ) : (
                      <div className="flex flex-col relative pb-2">
                        <div className="absolute left-3 top-4 bottom-4 w-0.5 bg-slate-800"></div>
                        <div className="flex gap-4 relative mb-6">
                          <div className="w-6 h-6 rounded-full bg-emerald-900 border-2 border-emerald-500 flex items-center justify-center text-[10px] font-bold text-emerald-400 z-10 shrink-0">O</div>
                          <div>
                            <div className="text-sm font-bold text-emerald-400">{routeInfo.origin_iata || routeInfo.origin_icao || 'N/A'}</div>
                            <div className="text-[10px] text-slate-400">{routeInfo.origin_airport || 'Unknown Airport'}</div>
                            {routeInfo.departure_time && <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1"><Clock className="w-3 h-3"/> Dep: {new Date(routeInfo.departure_time).toLocaleTimeString()}</div>}
                          </div>
                        </div>
                        <div className="flex gap-4 relative">
                          <div className="w-6 h-6 rounded-full bg-blue-900 border-2 border-blue-500 flex items-center justify-center text-[10px] font-bold text-blue-400 z-10 shrink-0">D</div>
                          <div>
                            <div className="text-sm font-bold text-blue-400">{routeInfo.destination_iata || routeInfo.destination_icao || 'N/A'}</div>
                            <div className="text-[10px] text-slate-400">{routeInfo.destination_airport || 'Unknown Airport'}</div>
                            {routeInfo.arrival_time && <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1"><Clock className="w-3 h-3"/> ETA: {new Date(routeInfo.arrival_time).toLocaleTimeString()}</div>}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* LOCAL WEATHER */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
                <button onClick={() => toggleSection('weather')} className="w-full p-3 flex items-center justify-between bg-slate-900/60 hover:bg-slate-800/80 transition-colors">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2"><Cloud className="w-4 h-4 text-sky-400" /> Current Weather</span>
                  {expandedSections.weather ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                </button>
                {expandedSections.weather && (
                  <div className="p-3 border-t border-slate-800">
                    {weather ? (
                      <div>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2.5 rounded-lg bg-slate-800 text-cyan-400">
                            {getWeatherIcon(weather.weather_description)}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white capitalize">{weather.weather_description || 'Clear'}</div>
                            <div className="text-xs text-slate-400 font-mono">Temp: {weather.temperature?.toFixed(1)}°C</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <WeatherCell icon={<Wind/>} label="Wind" value={`${weather.wind_speed?.toFixed(1)}m/s`} />
                          <WeatherCell icon={<Compass/>} label="Wind Dir" value={`${weather.wind_direction?.toFixed(0)}°`} />
                          <WeatherCell icon={<Activity/>} label="Pressure" value={`${weather.pressure}hPa`} />
                          <WeatherCell icon={<Droplets/>} label="Humidity" value={`${weather.humidity}%`} />
                          <WeatherCell icon={<Cloud/>} label="Clouds" value={`${weather.cloud_coverage}%`} />
                          <WeatherCell icon={<CloudRain/>} label="Rain" value={`${weather.rainfall?.toFixed(1) || 0}mm`} />
                        </div>
                      </div>
                    ) : (
                      <div className="h-16 flex items-center justify-center gap-2 text-slate-500 text-xs">
                        <Cloud className="w-4 h-4 animate-pulse" /> Fetching atmospherics...
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* AI PREDICTION MODEL */}
              <div className="border border-emerald-900/50 rounded-xl overflow-hidden bg-slate-900/40 relative">
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(16,185,129,0.03)_50%,transparent_75%)] bg-[length:250%_250%] animate-scan pointer-events-none"></div>
                <button onClick={() => toggleSection('prediction')} className="w-full p-3 flex items-center justify-between bg-slate-900/60 hover:bg-slate-800/80 transition-colors">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2"><Activity className="w-4 h-4" /> Machine Learning Prediction</span>
                  {expandedSections.prediction ? <ChevronDown className="w-4 h-4 text-emerald-500" /> : <ChevronRight className="w-4 h-4 text-emerald-500" />}
                </button>
                {expandedSections.prediction && (
                  <div className="p-3 border-t border-slate-800 relative z-10">
                    {predicting ? (
                      <div className="flex flex-col items-center justify-center py-4">
                        <RefreshCw className="w-5 h-5 text-emerald-400 animate-spin mb-2" />
                        <div className="text-[10px] text-emerald-500 font-mono animate-pulse">Running Neural Inference...</div>
                      </div>
                    ) : prediction && !prediction.error ? (
                      <div>
                        <div className="text-center mb-4">
                          <div className={`inline-block px-3 py-1.5 rounded-lg border text-xs font-mono font-bold ${getRiskColor(prediction.risk_level)}`}>
                            {prediction.risk_level.toUpperCase()}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-left mt-2">
                          <div className="col-span-2 p-2 rounded bg-slate-950/50 border border-slate-800 text-center">
                            <div className="text-[9px] text-slate-500 uppercase">Route</div>
                            <div className="text-sm font-bold text-slate-300">
                              {routeInfo?.origin_iata || '???'} → {routeInfo?.destination_iata || '???'}
                            </div>
                          </div>
                          
                          <div className="p-2 rounded bg-slate-950/50 border border-slate-800">
                            <div className="text-[9px] text-slate-500 uppercase">Planned Dist.</div>
                            <div className="text-sm font-bold text-emerald-400">{prediction.planned_route_distance ? prediction.planned_route_distance + ' km' : 'N/A'}</div>
                          </div>
                          <div className="p-2 rounded bg-slate-950/50 border border-slate-800">
                            <div className="text-[9px] text-slate-500 uppercase">Dist. Travelled</div>
                            <div className="text-sm font-bold text-blue-400">{prediction.current_distance_travelled ? prediction.current_distance_travelled + ' km' : 'N/A'}</div>
                          </div>
                          
                          <div className="p-2 rounded bg-slate-950/50 border border-slate-800">
                            <div className="text-[9px] text-slate-500 uppercase">Deviation Dist.</div>
                            <div className="text-sm font-bold text-orange-400">{prediction.deviation_distance ? prediction.deviation_distance + ' km' : 'N/A'}</div>
                          </div>
                          <div className="p-2 rounded bg-slate-950/50 border border-slate-800">
                            <div className="text-[9px] text-slate-500 uppercase">Deviation %</div>
                            <div className="text-sm font-bold text-orange-400">{prediction.deviation_percentage ? prediction.deviation_percentage + '%' : 'N/A'}</div>
                          </div>
                          
                          <div className="p-2 rounded bg-slate-950/50 border border-slate-800">
                            <div className="text-[9px] text-slate-500 uppercase">Weather Risk</div>
                            <div className="text-sm font-bold text-slate-300">{prediction.weather_risk} ({prediction.weather_impact_score}%)</div>
                          </div>
                          <div className="p-2 rounded bg-slate-950/50 border border-slate-800">
                            <div className="text-[9px] text-slate-500 uppercase">Predicted Delay</div>
                            <div className="text-sm font-bold text-rose-400">{prediction.estimated_delay}m</div>
                          </div>
                          
                          <div className="p-2 rounded bg-slate-950/50 border border-slate-800">
                            <div className="text-[9px] text-slate-500 uppercase">Overall Risk</div>
                            <div className="text-sm font-bold text-slate-300">{prediction.overall_risk_score ? prediction.overall_risk_score + '%' : 'N/A'}</div>
                          </div>
                          <div className="p-2 rounded bg-slate-950/50 border border-slate-800">
                            <div className="text-[9px] text-slate-500 uppercase">Confidence</div>
                            <div className="text-sm font-bold text-slate-300">{prediction.confidence_score ? prediction.confidence_score + '%' : Math.round(prediction.probability * 100) + '%'}</div>
                          </div>
                          
                          <div className="col-span-2 p-2 rounded bg-slate-950/50 border border-slate-800 text-center">
                            <div className="text-[9px] text-slate-500 uppercase">Suggested Action</div>
                            <div className="text-xs font-bold text-cyan-400">{prediction.suggested_action || 'N/A'}</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <div className="inline-block px-3 py-1 rounded-lg bg-slate-900/40 border border-slate-700 text-slate-400 text-xs font-mono mb-2">
                          PREDICTION FAILED
                        </div>
                        <div className="text-[10px] text-red-400 font-mono mt-1 px-4">{prediction.message || 'Unknown error'}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          </>
        )}
      </div>

    </div>
  );
}

const StatItem = ({ icon, label, value }) => (
  <div className="flex items-center gap-2">
    <div className="text-cyan-500/70 [&>svg]:w-4 [&>svg]:h-4">{icon}</div>
    <div>
      <div className="text-[9px] text-slate-400 font-mono uppercase">{label}</div>
      <div className="text-xs font-bold text-white font-mono">{value}</div>
    </div>
  </div>
);

const InfoCell = ({ label, value, highlight }) => (
  <div className={`p-2 rounded-lg border ${highlight ? 'bg-cyan-950/20 border-cyan-900/50' : 'bg-slate-950/50 border-slate-800/60'}`}>
    <div className="text-[9px] text-slate-500 uppercase font-mono">{label}</div>
    <div className={`text-[11px] font-mono font-medium truncate ${highlight ? 'text-cyan-400' : 'text-slate-300'}`}>{value}</div>
  </div>
);

const WeatherCell = ({ icon, label, value }) => (
  <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-950/50 border border-slate-800/50">
    <div className="text-slate-500 mb-1 [&>svg]:w-3.5 [&>svg]:h-3.5">{icon}</div>
    <div className="text-[9px] text-slate-500 uppercase font-mono">{label}</div>
    <div className="text-xs font-mono text-slate-200">{value}</div>
  </div>
);

const getWeatherIcon = (desc) => {
  if (!desc) return <Cloud />;
  const lower = desc.toLowerCase();
  if (lower.includes('rain')) return <CloudRain />;
  if (lower.includes('clear')) return <Wind />;
  return <Cloud />;
};

const getRiskColor = (risk) => {
  if (risk === 'Low Risk') return 'text-emerald-400 border-emerald-700 bg-emerald-900/40';
  if (risk === 'Medium Risk') return 'text-amber-400 border-amber-700 bg-amber-900/40';
  if (risk === 'High Risk') return 'text-orange-400 border-orange-700 bg-orange-900/40';
  if (risk === 'Critical Risk' || risk === 'Severe Weather') return 'text-rose-400 border-rose-700 bg-rose-900/40';
  return 'text-slate-400 border-slate-700 bg-slate-900/40';
};

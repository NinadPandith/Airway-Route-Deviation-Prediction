import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, Marker, TileLayer, Polyline, Tooltip, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

import {
  Activity, Compass, PlaneTakeoff, RefreshCw, AlertTriangle, Cloud, Plane,
  MapPin, Info, Clock, Play, Pause, Square, FastForward, Flag, Route as RouteIcon,
  BarChart3, Wind, Thermometer, Droplets, RotateCcw
} from 'lucide-react';

const API_BASE_URL = 'http://127.0.0.1:8000';

const toRad = (value) => (value * Math.PI) / 180;
const toDeg = (value) => (value * 180) / Math.PI;

const haversine = (lat1, lon1, lat2, lon2) => {
  const r = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)*Math.sin(dLon/2);
  return 2 * r * Math.asin(Math.sqrt(a));
};

const calculateBearing = (startLat, startLng, destLat, destLng) => {
  const startLatRad = toRad(startLat);
  const startLngRad = toRad(startLng);
  const destLatRad = toRad(destLat);
  const destLngRad = toRad(destLng);
  const y = Math.sin(destLngRad - startLngRad) * Math.cos(destLatRad);
  const x = Math.cos(startLatRad) * Math.sin(destLatRad) -
            Math.sin(startLatRad) * Math.cos(destLatRad) * Math.cos(destLngRad - startLngRad);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
};

const getClosestPointOnSegment = (p, p1, p2) => {
  const x = p[0], y = p[1];
  const x1 = p1[0], y1 = p1[1];
  const x2 = p2[0], y2 = p2[1];
  const A = x - x1, B = y - y1, C = x2 - x1, D = y2 - y1;
  const dot = A * C + B * D;
  const len_sq = C * C + D * D;
  let param = -1;
  if (len_sq !== 0) param = dot / len_sq;
  let xx, yy;
  if (param < 0) { xx = x1; yy = y1; }
  else if (param > 1) { xx = x2; yy = y2; }
  else { xx = x1 + param * C; yy = y1 + param * D; }
  return [xx, yy];
};

const createAircraftIcon = (heading = 0, color = '#ffffff') => {
  return L.divIcon({
    html: `
      <div style="transform: rotate(${heading}deg) scale(1.2); width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 0 5px rgba(255,255,255,0.5));">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6">
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

const createLabeledIcon = (label, bgColor = '#3b82f6') => {
  return L.divIcon({
    html: `
      <div style="display: flex; flex-direction: column; align-items: center;">
        <div style="background: ${bgColor}; padding: 2px 6px; border-radius: 4px; color: white; font-size: 10px; font-weight: bold; border: 1px solid rgba(255,255,255,0.5); font-family: monospace; text-shadow: 0 1px 2px rgba(0,0,0,0.8); white-space: nowrap; margin-bottom: 2px;">
          ${label}
        </div>
        <div style="width: 12px; height: 12px; background-color: white; border: 3px solid ${bgColor}; border-radius: 50%; box-shadow: 0 0 10px ${bgColor};"></div>
      </div>
    `,
    className: 'leaflet-custom-marker',
    iconSize: [60, 40],
    iconAnchor: [30, 34],
  });
};

const MapController = ({ flight, destination }) => {
  const map = useMap();
  useEffect(() => {
    if (flight && destination) {
      const bounds = L.latLngBounds([
        [destination.origin_lat, destination.origin_lon], 
        [destination.destination_lat, destination.destination_lon]
      ]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 });
    }
  }, [flight, destination, map]);
  return null;
};

// Available Simulation Speeds
const SPEED_OPTIONS = [1, 2, 5, 10, 20, 30, 50];

export default function SimulationMode({ showNotification }) {
  const [flights, setFlights] = useState([]);
  const [selectedFlight, setSelectedFlight] = useState(null);
  
  // Simulation State
  const [status, setStatus] = useState('stopped'); // stopped, playing, paused, completed
  const [speedMult, setSpeedMult] = useState(1);
  const [session, setSession] = useState(null);
  
  // Dynamic State
  const [simAircraft, setSimAircraft] = useState(null);
  const [destination, setDestination] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [history, setHistory] = useState([]); 
  
  // Calculated Progress Metrics
  const [progressData, setProgressData] = useState({
    distanceCovered: 0,
    distanceRemaining: 0,
    totalDistance: 0,
    progressPercent: 0,
    etaMinutes: 0
  });

  // Analytics Metrics
  const [analytics, setAnalytics] = useState({
    maxDev: 0,
    maxAlt: 0,
    avgSpeedSum: 0,
    speedCount: 0
  });

  // Refs for animation loop
  const requestRef = useRef();
  const lastTimeRef = useRef();
  const simStateRef = useRef();
  const destRef = useRef();
  
  // Metrics
  const [timeElapsed, setTimeElapsed] = useState(0);

  // 1. Fetch Manual Flights
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/flights?status=all&limit=200`)
      .then(r => r.json())
      .then(data => setFlights(data))
      .catch(e => showNotification('error', 'Failed to fetch manual flights.'));
  }, []);
  
  const startSession = async (flight) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/simulation/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flight_id: flight.id })
      });
      const sess = await res.json();
      setSession(sess);
      
      const routeRes = await fetch(`${API_BASE_URL}/api/simulation/${flight.id}/route`);
      const routeData = await routeRes.json();
      setDestination(routeData);
      destRef.current = routeData;
      
      const totalDist = haversine(routeData.origin_lat, routeData.origin_lon, routeData.destination_lat, routeData.destination_lon);
      
      const initialAircraft = {
        latitude: routeData.origin_lat,
        longitude: routeData.origin_lon,
        altitude: 0, // Starts on ground
        vertical_speed: 0,
        speed: 150, // Taxi/Takeoff speed
        heading: calculateBearing(routeData.origin_lat, routeData.origin_lon, routeData.destination_lat, routeData.destination_lon),
        wind_speed: 15 + Math.random() * 10,
        wind_direction: Math.random() * 360,
        weather_severity: 0.1 + Math.random() * 0.2,
        temperature: 15 + Math.random() * 10,
        pressure: 1013,
        visibility: 10000,
        phase: 'Taxi'
      };
      
      setSimAircraft(initialAircraft);
      simStateRef.current = initialAircraft;
      setHistory([[routeData.origin_lat, routeData.origin_lon]]);
      setStatus('playing');
      setTimeElapsed(0);
      setPrediction(null);
      setProgressData({
        distanceCovered: 0,
        distanceRemaining: totalDist,
        totalDistance: totalDist,
        progressPercent: 0,
        etaMinutes: 0
      });
      setAnalytics({ maxDev: 0, maxAlt: 0, avgSpeedSum: 0, speedCount: 0 });
      showNotification('success', `Simulation Started: ${flight.origin} to ${flight.destination}`);
    } catch (e) {
      showNotification('error', 'Failed to start simulation session.');
    }
  };
  
  const handleSelectFlight = (e) => {
    const id = parseInt(e.target.value);
    const flight = flights.find(f => f.id === id);
    setSelectedFlight(flight);
    if (flight) {
      setStatus('stopped');
      setSession(null);
      setDestination(null);
      setSimAircraft(null);
      setHistory([]);
      setPrediction(null);
      setTimeElapsed(0);
    }
  };

  const cycleSpeed = () => {
    const idx = SPEED_OPTIONS.indexOf(speedMult);
    const nextIdx = (idx + 1) % SPEED_OPTIONS.length;
    setSpeedMult(SPEED_OPTIONS[nextIdx]);
  };

  // 2. The Animation Loop
  const updateSimulation = (time) => {
    if (status !== 'playing' || !simStateRef.current || !destRef.current) {
      if (status === 'playing') requestRef.current = requestAnimationFrame(updateSimulation);
      return;
    }

    if (lastTimeRef.current !== undefined) {
      const deltaTime = (time - lastTimeRef.current) / 1000;
      const simTimeDelta = deltaTime * speedMult;
      
      const current = simStateRef.current;
      const dest = destRef.current;
      
      const totalDist = haversine(dest.origin_lat, dest.origin_lon, dest.destination_lat, dest.destination_lon);
      const distCovered = haversine(dest.origin_lat, dest.origin_lon, current.latitude, current.longitude);
      const distRemaining = haversine(current.latitude, current.longitude, dest.destination_lat, dest.destination_lon);
      const progress = (distCovered / totalDist) * 100;
      
      // End simulation if we arrived
      if (progress >= 99.8 || distRemaining < 2) {
        setStatus('completed');
        return;
      }

      // Determine Phase and Adjust Altitude/Speed
      let phase = 'Taxi';
      let targetAlt = 35000;
      let targetSpeed = 450;
      let targetVs = 0;

      if (progress < 1) {
        phase = 'Takeoff';
        targetAlt = 1000;
        targetSpeed = 180;
        targetVs = 1500;
      } else if (progress < 15) {
        phase = 'Climb';
        targetAlt = 35000;
        targetSpeed = 350;
        targetVs = 2000;
      } else if (progress < 85) {
        phase = 'Cruise';
        targetAlt = 35000;
        targetSpeed = 480;
        targetVs = 0;
      } else if (progress < 98) {
        phase = 'Descent';
        targetAlt = 3000;
        targetSpeed = 250;
        targetVs = -1500;
      } else {
        phase = 'Landing';
        targetAlt = 0;
        targetSpeed = 140;
        targetVs = -500;
      }

      // Smoothly approach targets
      const altDiff = targetAlt - current.altitude;
      const newAlt = Math.max(0, current.altitude + (altDiff > 0 ? 1 : -1) * Math.min(Math.abs(altDiff), 50 * simTimeDelta));
      
      const speedDiff = targetSpeed - current.speed;
      const newSpeed = current.speed + (speedDiff > 0 ? 1 : -1) * Math.min(Math.abs(speedDiff), 2 * simTimeDelta);

      const speedKmH = newSpeed * 1.852;
      const speedKmS = speedKmH / 3600;
      const distanceMovedKm = speedKmS * simTimeDelta;
      
      const distDeg = distanceMovedKm / 111.0;
      const idealHeading = calculateBearing(current.latitude, current.longitude, dest.destination_lat, dest.destination_lon);
      
      // Add wandering deviation for realism
      const deviationAmt = (Math.random() - 0.5) * 1.5; 
      const newHeading = (idealHeading + deviationAmt + 360) % 360;
      const headingRad = toRad(newHeading);
      
      const newLat = current.latitude + distDeg * Math.cos(headingRad);
      const newLon = current.longitude + distDeg * Math.sin(headingRad);
      
      // Update weather slightly
      const newTemp = current.temperature + (Math.random() - 0.5) * 0.1 * simTimeDelta;

      const updated = {
        ...current,
        latitude: newLat,
        longitude: newLon,
        altitude: newAlt,
        speed: newSpeed,
        vertical_speed: (newAlt - current.altitude) / Math.max(0.001, simTimeDelta) * 60, // fpm
        heading: newHeading,
        phase: phase,
        prev_latitude: current.latitude,
        prev_longitude: current.longitude,
        temperature: newTemp
      };
      
      simStateRef.current = updated;
      setSimAircraft(updated);
      setTimeElapsed(prev => prev + simTimeDelta);
      
      setProgressData({
        distanceCovered: distCovered,
        distanceRemaining: distRemaining,
        totalDistance: totalDist,
        progressPercent: Math.min(progress, 100),
        etaMinutes: speedKmH > 0 ? (distRemaining / speedKmH) * 60 : 0
      });

      setAnalytics(prev => ({
        maxAlt: Math.max(prev.maxAlt, newAlt),
        avgSpeedSum: prev.avgSpeedSum + newSpeed,
        speedCount: prev.speedCount + 1,
        maxDev: prev.maxDev
      }));
    }
    
    lastTimeRef.current = time;
    requestRef.current = requestAnimationFrame(updateSimulation);
  };

  useEffect(() => {
    if (status === 'playing') {
      lastTimeRef.current = performance.now();
      requestRef.current = requestAnimationFrame(updateSimulation);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [status, speedMult]);
  
  // 3. Periodic Telemetry POST (Every 1 real second for responsiveness)
  useEffect(() => {
    if (status !== 'playing' || !simAircraft || !session || !destination) return;
    
    const interval = setInterval(() => {
      const payload = {
        session_id: session.id,
        latitude: simAircraft.latitude,
        longitude: simAircraft.longitude,
        altitude: simAircraft.altitude,
        speed: simAircraft.speed,
        heading: simAircraft.heading,
        weather_severity: simAircraft.weather_severity,
        prev_latitude: simAircraft.prev_latitude,
        prev_longitude: simAircraft.prev_longitude,
        origin_lat: destination.origin_lat,
        origin_lon: destination.origin_lon,
        destination_lat: destination.destination_lat,
        destination_lon: destination.destination_lon,
        wind_speed: simAircraft.wind_speed,
        wind_direction: simAircraft.wind_direction
      };
      
      fetch(`${API_BASE_URL}/api/simulation/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(r => r.json())
      .then(data => {
        setPrediction(data);
        setHistory(prev => [...prev, [simAircraft.latitude, simAircraft.longitude]]);
        if (data.deviation_distance) {
          setAnalytics(prev => ({ ...prev, maxDev: Math.max(prev.maxDev, data.deviation_distance) }));
        }
      })
      .catch(e => console.error("Telemetry post failed", e));
      
    }, 1000);
    
    return () => clearInterval(interval);
  }, [status, session, destination]); 
  
  // Calculate rendering geometries
  let plannedRouteCoords = [];
  let deviationVector = null;
  let crossTrackError = 0;
  if (destination && simAircraft) {
    plannedRouteCoords = [
      [destination.origin_lat, destination.origin_lon],
      [destination.destination_lat, destination.destination_lon]
    ];
    
    const closest = getClosestPointOnSegment(
      [simAircraft.latitude, simAircraft.longitude],
      plannedRouteCoords[0],
      plannedRouteCoords[1]
    );
    deviationVector = [
      [simAircraft.latitude, simAircraft.longitude],
      [closest[0], closest[1]]
    ];
    crossTrackError = haversine(simAircraft.latitude, simAircraft.longitude, closest[0], closest[1]);
  }

  // Dashboard Section Helper
  const MetricRow = ({ label, value, unit, highlight = false }) => (
    <div className="flex justify-between items-center py-1 border-b border-white/5 last:border-0">
      <span className="text-white/50 text-xs">{label}</span>
      <span className={`text-sm font-mono ${highlight ? 'text-secondary font-bold' : 'text-white'}`}>
        {value} {unit && <span className="text-[10px] text-white/40">{unit}</span>}
      </span>
    </div>
  );

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col xl:flex-row gap-4 w-full">
      
      {/* ================================================================================= */}
      {/* MAP VIEW */}
      {/* ================================================================================= */}
      <div className="flex-1 rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative bg-dark">
        {/* Top Controls Overlay */}
        <div className="absolute top-4 left-4 right-4 z-[1000] flex justify-between items-start pointer-events-none">
          <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-xl pointer-events-auto flex items-center gap-3">
            <select 
              className="bg-black/30 border border-white/20 text-white rounded-lg px-3 py-1.5 text-sm outline-none w-56 focus:border-secondary transition-colors"
              onChange={handleSelectFlight}
              value={selectedFlight ? selectedFlight.id : ''}
              disabled={status === 'playing'}
            >
              <option value="">Select manual flight...</option>
              {flights.map(f => (
                <option key={f.id} value={f.id}>{f.flight_number} | {f.origin.split(' ')[0]} ✈ {f.destination.split(' ')[0]}</option>
              ))}
            </select>
            
            {selectedFlight && (status === 'stopped' || status === 'completed') && (
              <button 
                onClick={() => startSession(selectedFlight)}
                className="bg-secondary text-dark px-4 py-1.5 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-secondary/90 transition-colors pointer-events-auto shadow-[0_0_15px_rgba(34,211,238,0.4)]"
              >
                <Play className="w-4 h-4" /> {status === 'completed' ? 'Restart' : 'Start Simulation'}
              </button>
            )}
            
            {status !== 'stopped' && status !== 'completed' && (
              <div className="flex items-center gap-2 border-l border-white/20 pl-3">
                <button onClick={() => setStatus(status === 'playing' ? 'paused' : 'playing')} className="p-1.5 bg-white/10 rounded-lg hover:bg-white/20 text-white transition-colors">
                  {status === 'playing' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button onClick={() => setStatus('stopped')} className="p-1.5 bg-white/10 rounded-lg hover:bg-red-500/80 text-white transition-colors">
                  <Square className="w-4 h-4" />
                </button>
                <button onClick={cycleSpeed} className="px-2 py-1.5 bg-secondary/20 border border-secondary/50 rounded-lg hover:bg-secondary/40 text-secondary flex items-center font-bold text-xs w-16 justify-center transition-colors">
                  <FastForward className="w-3 h-3 mr-1" /> {speedMult}x
                </button>
              </div>
            )}
          </div>
          
          <div className="flex flex-col gap-2 pointer-events-auto">
             <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2 font-mono text-xs text-white/80 shadow-lg flex items-center gap-2">
                <Clock className="w-3 h-3 text-secondary" /> SIM TIME: {Math.floor(timeElapsed / 60)}m {Math.floor(timeElapsed % 60)}s
             </div>
             {simAircraft && (
               <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2 font-mono text-xs text-white/80 shadow-lg flex items-center gap-2">
                  <PlaneTakeoff className="w-3 h-3 text-secondary" /> PHASE: <span className="text-white font-bold">{simAircraft.phase}</span>
               </div>
             )}
          </div>
        </div>

        {/* Completion Modal */}
        {status === 'completed' && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-[2000] flex items-center justify-center pointer-events-auto">
             <div className="bg-dark border border-white/20 rounded-2xl p-8 max-w-md w-full shadow-[0_0_50px_rgba(34,211,238,0.2)] text-center">
                <Flag className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h2 className="text-2xl font-black text-white mb-2">SIMULATION COMPLETED</h2>
                <p className="text-white/60 mb-6 text-sm">Aircraft has successfully reached its destination.</p>
                
                <div className="grid grid-cols-2 gap-4 mb-8 text-left">
                  <div className="bg-black/50 p-3 rounded-lg border border-white/5">
                     <div className="text-[10px] text-white/50 mb-1">TOTAL FLIGHT TIME</div>
                     <div className="text-lg font-mono text-white">{Math.floor(timeElapsed / 60)}m {Math.floor(timeElapsed % 60)}s</div>
                  </div>
                  <div className="bg-black/50 p-3 rounded-lg border border-white/5">
                     <div className="text-[10px] text-white/50 mb-1">DISTANCE FLOWN</div>
                     <div className="text-lg font-mono text-white">{Math.round(progressData.distanceCovered)} km</div>
                  </div>
                  <div className="bg-black/50 p-3 rounded-lg border border-white/5">
                     <div className="text-[10px] text-white/50 mb-1">AVG GROUND SPEED</div>
                     <div className="text-lg font-mono text-white">{Math.round(analytics.avgSpeedSum / Math.max(1, analytics.speedCount))} kt</div>
                  </div>
                  <div className="bg-black/50 p-3 rounded-lg border border-white/5">
                     <div className="text-[10px] text-white/50 mb-1">MAX DEVIATION</div>
                     <div className="text-lg font-mono text-red-400">{analytics.maxDev.toFixed(2)} km</div>
                  </div>
                </div>

                <div className="flex justify-center gap-4">
                   <button onClick={() => setStatus('stopped')} className="px-6 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 font-bold transition-colors">Close</button>
                   <button onClick={() => startSession(selectedFlight)} className="px-6 py-2 rounded-lg bg-secondary text-dark hover:bg-secondary/90 font-bold flex items-center gap-2 transition-colors"><RotateCcw className="w-4 h-4"/> Restart</button>
                </div>
             </div>
          </div>
        )}

        <MapContainer center={[20, 0]} zoom={3} className="w-full h-full bg-[#0a0a0a]" zoomControl={false} attributionControl={false}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png" maxZoom={19} />
          <ZoomControl position="bottomright" />
          
          {selectedFlight && destination && <MapController flight={selectedFlight} destination={destination} />}

          {/* Planned Route (Blue Dashed) */}
          {plannedRouteCoords.length > 0 && (
            <Polyline positions={plannedRouteCoords} color="#3b82f6" weight={3} dashArray="8, 12" opacity={0.6} />
          )}

          {/* Actual Route History (Green Solid) */}
          {history.length > 0 && (
            <Polyline positions={history} color="#22c55e" weight={4} opacity={0.9} />
          )}

          {/* Cross Track Error Vector (Red Dashed) */}
          {deviationVector && (
            <Polyline positions={deviationVector} color="#ef4444" weight={2} dashArray="4, 4" opacity={0.8} />
          )}

          {/* Markers */}
          {destination && (
            <>
              <Marker position={[destination.origin_lat, destination.origin_lon]} icon={createLabeledIcon(selectedFlight?.origin.split(' ')[0], '#3b82f6')} />
              <Marker position={[destination.destination_lat, destination.destination_lon]} icon={createLabeledIcon(selectedFlight?.destination.split(' ')[0], '#ef4444')} />
            </>
          )}

          {/* White Aircraft Marker */}
          {simAircraft && (
            <Marker position={[simAircraft.latitude, simAircraft.longitude]} icon={createAircraftIcon(simAircraft.heading, '#ffffff')} zIndexOffset={1000}>
              <Tooltip permanent direction="right" offset={[15, 0]} className="bg-black/80 backdrop-blur border border-white/20 text-white font-mono text-xs rounded shadow-lg px-2 py-1">
                <div className="font-bold text-secondary mb-1">{selectedFlight?.flight_number}</div>
                <div>{Math.round(simAircraft.speed)}kt | FL{Math.round(simAircraft.altitude/100)}</div>
                <div className="text-[10px] text-white/50">{progressData.distanceRemaining.toFixed(0)} km to go</div>
              </Tooltip>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* ================================================================================= */}
      {/* EXPANDED SIMULATION DASHBOARD */}
      {/* ================================================================================= */}
      <div className="w-full xl:w-[450px] shrink-0 flex flex-col h-full bg-dark/60 backdrop-blur-xl rounded-2xl border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-y-auto no-scrollbar relative p-5 gap-5">
        <h2 className="text-xl font-black text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-secondary" /> AVIATION METRICS
        </h2>

        {/* 1. FLIGHT PROGRESS */}
        <div className="bg-black/40 rounded-xl p-4 border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 bg-blue-500 h-full"></div>
          <h3 className="text-[10px] font-bold text-white/50 mb-3 tracking-widest flex items-center gap-2">
            <RouteIcon className="w-3 h-3" /> FLIGHT PROGRESS
          </h3>
          
          <div className="mb-4">
             <div className="flex justify-between items-end mb-1">
                <span className="text-2xl font-black text-white">{progressData.progressPercent.toFixed(1)}%</span>
                <span className="text-xs font-mono text-blue-400">ETA: {Math.floor(progressData.etaMinutes/60)}h {Math.floor(progressData.etaMinutes%60)}m</span>
             </div>
             <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
               <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progressData.progressPercent}%` }}></div>
             </div>
          </div>
          
          <MetricRow label="Total Route Distance" value={Math.round(progressData.totalDistance)} unit="km" />
          <MetricRow label="Distance Covered" value={Math.round(progressData.distanceCovered)} unit="km" highlight />
          <MetricRow label="Distance Remaining" value={Math.round(progressData.distanceRemaining)} unit="km" />
        </div>

        {/* 2. TELEMETRY */}
        <div className="bg-black/40 rounded-xl p-4 border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 bg-secondary h-full"></div>
          <h3 className="text-[10px] font-bold text-white/50 mb-3 tracking-widest flex items-center gap-2">
            <Compass className="w-3 h-3" /> TELEMETRY
          </h3>
          <div className="grid grid-cols-2 gap-x-4">
             <div>
                <MetricRow label="Latitude" value={simAircraft?.latitude.toFixed(4) || '---'} />
                <MetricRow label="Longitude" value={simAircraft?.longitude.toFixed(4) || '---'} />
                <MetricRow label="Ground Speed" value={simAircraft ? Math.round(simAircraft.speed) : '---'} unit="kt" highlight />
                <MetricRow label="Air Speed" value={simAircraft ? Math.round(simAircraft.speed * 1.05) : '---'} unit="kt" />
             </div>
             <div>
                <MetricRow label="Altitude" value={simAircraft ? Math.round(simAircraft.altitude) : '---'} unit="ft" highlight />
                <MetricRow label="Vertical Spd" value={simAircraft ? Math.round(simAircraft.vertical_speed) : '---'} unit="fpm" />
                <MetricRow label="Heading" value={simAircraft ? Math.round(simAircraft.heading) : '---'} unit="°" />
                <MetricRow label="Bearing" value={destRef.current && simAircraft ? Math.round(calculateBearing(simAircraft.latitude, simAircraft.longitude, destRef.current.destination_lat, destRef.current.destination_lon)) : '---'} unit="°" />
             </div>
          </div>
        </div>

        {/* 3. ROUTE ANALYSIS */}
        <div className="bg-black/40 rounded-xl p-4 border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 bg-green-500 h-full"></div>
          <h3 className="text-[10px] font-bold text-white/50 mb-3 tracking-widest flex items-center gap-2">
            <MapPin className="w-3 h-3" /> ROUTE ANALYSIS
          </h3>
          <MetricRow label="Route Status" value={crossTrackError > 5 ? 'Deviating' : 'On Track'} highlight />
          <MetricRow label="Cross Track Error" value={crossTrackError.toFixed(2)} unit="km" />
          <MetricRow label="Deviation %" value={prediction ? prediction.deviation_percentage : '0.00'} unit="%" />
        </div>

        {/* 4. MACHINE LEARNING ENGINE */}
        <div className="bg-black/40 rounded-xl p-4 border border-white/5 relative overflow-hidden group">
          <div className="absolute -right-10 -bottom-10 opacity-5 group-hover:opacity-10 transition-opacity"><Activity className="w-40 h-40" /></div>
          <div className="absolute top-0 left-0 w-1 bg-purple-500 h-full"></div>
          
          <h3 className="text-[10px] font-bold text-white/50 mb-3 tracking-widest flex items-center gap-2 relative z-10">
            <Activity className="w-3 h-3" /> ML PREDICTION ENGINE
          </h3>
          
          {prediction ? (
            <div className="relative z-10">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-black/50 rounded-lg p-3 border border-white/5 shadow-inner">
                  <div className="text-[10px] text-white/50 mb-1">RISK LEVEL</div>
                  <div className={`text-lg font-black ${
                    prediction.risk_level === 'High Risk' ? 'text-red-500' :
                    prediction.risk_level === 'Medium Risk' ? 'text-orange-400' : 'text-green-400'
                  }`}>{prediction.risk_level}</div>
                </div>
                <div className="bg-black/50 rounded-lg p-3 border border-white/5 shadow-inner">
                  <div className="text-[10px] text-white/50 mb-1">CONFIDENCE</div>
                  <div className="text-lg font-black text-white">{prediction.confidence_score}%</div>
                </div>
              </div>

              <MetricRow label="Predicted Delay" value={`+${prediction.estimated_delay}`} unit="mins" highlight />
              <MetricRow label="Delay Category" value={prediction.estimated_delay > 30 ? 'Severe' : prediction.estimated_delay > 10 ? 'Moderate' : 'None'} />
              <MetricRow label="Fuel Impact (Est.)" value={`+${(crossTrackError * 12.5).toFixed(0)}`} unit="kg" />
              <MetricRow label="Prediction Time" value={new Date(prediction.prediction_time).toLocaleTimeString()} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 opacity-50 text-xs text-white/50 font-mono text-center">
              <RefreshCw className="w-5 h-5 animate-spin mb-2" />
              WAITING FOR DATA...
            </div>
          )}
        </div>
        
        {/* 5. WEATHER & ENVIRONMENT */}
        <div className="bg-black/40 rounded-xl p-4 border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 bg-yellow-500 h-full"></div>
          <h3 className="text-[10px] font-bold text-white/50 mb-3 tracking-widest flex items-center gap-2">
            <Cloud className="w-3 h-3" /> WEATHER ENVIRONMENT
          </h3>
          <div className="grid grid-cols-2 gap-x-4">
            <div>
              <MetricRow label="Condition" value={prediction?.weather_risk || 'Clear'} highlight />
              <MetricRow label="Temperature" value={simAircraft?.temperature.toFixed(1) || '---'} unit="°C" />
              <MetricRow label="Visibility" value="10" unit="km" />
            </div>
            <div>
              <MetricRow label="Wind Spd" value={simAircraft ? Math.round(simAircraft.wind_speed) : '---'} unit="kt" />
              <MetricRow label="Wind Dir" value={simAircraft ? Math.round(simAircraft.wind_direction) : '---'} unit="°" />
              <MetricRow label="Pressure" value="1013" unit="hPa" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

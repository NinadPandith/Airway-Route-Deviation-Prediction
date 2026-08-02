import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, Marker, TileLayer, Polyline, Tooltip, Popup, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

import {
  Activity, Compass, PlaneTakeoff, Plane, RefreshCw, Wind, Maximize,
  Search, X, Navigation, Thermometer, CloudRain, Droplets, Filter, AlertTriangle,
  MapPin, ChevronDown, ChevronRight, Info, Clock, AlertCircle, Play, Pause, Square, FastForward, RotateCcw
} from 'lucide-react';

const API_BASE_URL = 'http://127.0.0.1:8000';

const toRad = (value) => (value * Math.PI) / 180;
const toDeg = (value) => (value * 180) / Math.PI;

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

const createAircraftIcon = (heading = 0, color = '#22d3ee') => {
  return L.divIcon({
    html: `
      <div style="transform: rotate(${heading}deg) scale(1.2); width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; opacity: 1;">
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

const MapController = ({ flight, destination }) => {
  const map = useMap();
  useEffect(() => {
    if (flight && destination) {
      const bounds = L.latLngBounds([
        [flight.latitude, flight.longitude], 
        [destination.destination_lat, destination.destination_lon]
      ]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 });
    }
  }, [flight, destination, map]);
  return null;
};

export default function SimulationMode({ showNotification }) {
  const [flights, setFlights] = useState([]);
  const [selectedFlight, setSelectedFlight] = useState(null);
  
  // Simulation State
  const [status, setStatus] = useState('stopped'); // stopped, playing, paused
  const [speedMult, setSpeedMult] = useState(1);
  const [session, setSession] = useState(null);
  
  // Dynamic State
  const [simAircraft, setSimAircraft] = useState(null);
  const [destination, setDestination] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [history, setHistory] = useState([]); 
  
  // Refs for animation loop
  const requestRef = useRef();
  const lastTimeRef = useRef();
  const simStateRef = useRef();
  
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
      
      const initialAircraft = {
        latitude: flight.latitude,
        longitude: flight.longitude,
        altitude: flight.altitude,
        speed: flight.speed || 400,
        heading: calculateBearing(flight.latitude, flight.longitude, routeData.destination_lat, routeData.destination_lon),
        wind_speed: 15,
        wind_direction: 45,
        weather_severity: 0.1
      };
      
      setSimAircraft(initialAircraft);
      simStateRef.current = initialAircraft;
      setHistory([[flight.latitude, flight.longitude]]);
      setStatus('playing');
      setTimeElapsed(0);
      setPrediction(null);
      showNotification('success', `Started simulation for ${flight.flight_number}`);
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

  // 2. The Animation Loop
  const updateSimulation = (time) => {
    if (status !== 'playing' || !simStateRef.current || !destination) {
      if (status === 'playing') requestRef.current = requestAnimationFrame(updateSimulation);
      return;
    }
    if (lastTimeRef.current !== undefined) {
      const deltaTime = (time - lastTimeRef.current) / 1000;
      
      const speedKmH = simStateRef.current.speed * 1.852;
      const speedKmS = speedKmH / 3600;
      const distanceKm = speedKmS * deltaTime * speedMult;
      
      const distDeg = distanceKm / 111.0;
      const headingRad = toRad(simStateRef.current.heading);
      
      const newLat = simStateRef.current.latitude + distDeg * Math.cos(headingRad);
      const newLon = simStateRef.current.longitude + distDeg * Math.sin(headingRad);
      
      const deviation = (Math.random() - 0.5) * 1.0; 
      const newHeading = (simStateRef.current.heading + deviation) % 360;
      
      const updated = {
        ...simStateRef.current,
        latitude: newLat,
        longitude: newLon,
        heading: newHeading,
        prev_latitude: simStateRef.current.latitude,
        prev_longitude: simStateRef.current.longitude,
      };
      
      simStateRef.current = updated;
      setSimAircraft(updated);
      setTimeElapsed(prev => prev + deltaTime * speedMult);
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
  }, [status, speedMult, destination]);
  
  // 3. Periodic Telemetry POST (Every 2 real seconds)
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
      })
      .catch(e => console.error("Telemetry post failed", e));
      
    }, 2000);
    
    return () => clearInterval(interval);
  }, [status, session, destination]); 
  
  let plannedRouteCoords = [];
  let deviationVector = null;
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
  }

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col md:flex-row gap-4 w-full">
      <div className="flex-1 rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative bg-dark">
        <div className="absolute top-4 left-4 right-4 z-[1000] flex justify-between items-start pointer-events-none">
          <div className="bg-black/50 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-xl pointer-events-auto flex items-center gap-3">
            <select 
              className="bg-black/30 border border-white/20 text-white rounded-lg px-3 py-1.5 text-sm outline-none w-48"
              onChange={handleSelectFlight}
              value={selectedFlight ? selectedFlight.id : ''}
            >
              <option value="">Select manual flight...</option>
              {flights.map(f => (
                <option key={f.id} value={f.id}>{f.flight_number} - {f.origin.split(' ')[0]} to {f.destination.split(' ')[0]}</option>
              ))}
            </select>
            
            {selectedFlight && status === 'stopped' && (
              <button 
                onClick={() => startSession(selectedFlight)}
                className="bg-secondary text-dark px-4 py-1.5 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-secondary/90 transition-colors"
              >
                <Play className="w-4 h-4" /> Start
              </button>
            )}
            
            {status !== 'stopped' && (
              <div className="flex items-center gap-2 border-l border-white/20 pl-3">
                <button onClick={() => setStatus(status === 'playing' ? 'paused' : 'playing')} className="p-1.5 bg-white/10 rounded-lg hover:bg-white/20 text-white">
                  {status === 'playing' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button onClick={() => setStatus('stopped')} className="p-1.5 bg-white/10 rounded-lg hover:bg-red-500/80 text-white">
                  <Square className="w-4 h-4" />
                </button>
                <button onClick={() => setSpeedMult(m => m >= 10 ? 1 : m === 1 ? 2 : m === 2 ? 5 : 10)} className="p-1.5 bg-white/10 rounded-lg hover:bg-white/20 text-white flex items-center font-mono text-xs w-12 justify-center">
                  {speedMult}x
                </button>
              </div>
            )}
          </div>
          
          <div className="bg-black/50 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2 pointer-events-auto font-mono text-xs text-white/70">
            SIM TIME: {Math.floor(timeElapsed / 60)}m {Math.floor(timeElapsed % 60)}s
          </div>
        </div>

        <MapContainer
          center={[20, 0]}
          zoom={3}
          className="w-full h-full bg-dark"
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
            maxZoom={19}
          />
          <ZoomControl position="bottomright" />
          
          {selectedFlight && destination && (
            <MapController flight={selectedFlight} destination={destination} />
          )}

          {plannedRouteCoords.length > 0 && (
            <Polyline
              positions={plannedRouteCoords}
              color="#3b82f6"
              weight={2}
              dashArray="5, 10"
              opacity={0.5}
            />
          )}

          {history.length > 0 && (
            <Polyline
              positions={history}
              color="#22c55e"
              weight={3}
              opacity={0.8}
            />
          )}

          {deviationVector && (
            <Polyline
              positions={deviationVector}
              color="#ef4444"
              weight={2}
              dashArray="4, 6"
              opacity={0.8}
            />
          )}

          {destination && (
            <Marker position={[destination.destination_lat, destination.destination_lon]} icon={createAirportIcon()}>
              <Tooltip direction="top" className="custom-tooltip font-mono">DESTINATION</Tooltip>
            </Marker>
          )}

          {simAircraft && (
            <Marker
              position={[simAircraft.latitude, simAircraft.longitude]}
              icon={createAircraftIcon(simAircraft.heading, prediction?.risk_level === 'High Risk' ? '#ef4444' : '#22d3ee')}
              zIndexOffset={1000}
            >
              <Tooltip permanent direction="bottom" offset={[0, 10]} className="bg-transparent border-none shadow-none text-white font-mono text-xs drop-shadow-md">
                {selectedFlight?.flight_number}
              </Tooltip>
            </Marker>
          )}
        </MapContainer>
      </div>

      <div className="w-full md:w-[350px] lg:w-[400px] shrink-0 flex flex-col h-full bg-dark/40 rounded-2xl border border-white/10 shadow-2xl overflow-y-auto no-scrollbar relative p-4 gap-4">
        <h2 className="text-xl font-black text-white flex items-center gap-2 mb-2">
          <PlaneTakeoff className="w-5 h-5 text-secondary" /> SIMULATION METRICS
        </h2>

        <div className="bg-black/30 rounded-xl p-4 border border-white/10">
          <h3 className="text-[10px] font-bold text-white/50 mb-3 tracking-widest flex items-center gap-2">
            <Info className="w-3 h-3" /> FLIGHT INFO
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-white/60">Flight</span><span className="text-white font-mono">{selectedFlight ? selectedFlight.flight_number : 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-white/60">Aircraft</span><span className="text-white truncate max-w-[150px]">{selectedFlight ? selectedFlight.aircraft_name : 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-white/60">Speed</span><span className="text-secondary font-mono">{simAircraft ? Math.round(simAircraft.speed) : 0} kt</span></div>
            <div className="flex justify-between"><span className="text-white/60">Heading</span><span className="text-white font-mono">{simAircraft ? Math.round(simAircraft.heading) : 0}°</span></div>
          </div>
        </div>

        <div className="bg-black/30 rounded-xl p-4 border border-white/10 flex-1 relative overflow-hidden group">
          <div className="absolute -right-10 -bottom-10 opacity-5 group-hover:opacity-10 transition-opacity"><Activity className="w-40 h-40" /></div>
          
          <h3 className="text-[10px] font-bold text-white/50 mb-3 tracking-widest flex items-center gap-2">
            <Activity className="w-3 h-3" /> ML PREDICTION ENGINE
          </h3>
          
          {prediction ? (
            <div className="space-y-5 relative z-10">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                  <div className="text-[10px] text-white/50 mb-1">RISK LEVEL</div>
                  <div className={`text-lg font-black ${
                    prediction.risk_level === 'High Risk' ? 'text-red-500' :
                    prediction.risk_level === 'Medium Risk' ? 'text-orange-400' : 'text-green-400'
                  }`}>{prediction.risk_level}</div>
                </div>
                <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                  <div className="text-[10px] text-white/50 mb-1">CONFIDENCE</div>
                  <div className="text-lg font-black text-white">{prediction.confidence_score}%</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                  <div className="text-[10px] text-white/50 mb-1">DEVIATION DIST</div>
                  <div className="text-lg font-black text-white">{prediction.deviation_distance} <span className="text-xs font-normal text-white/50">km</span></div>
                </div>
                <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                  <div className="text-[10px] text-white/50 mb-1">DEVIATION %</div>
                  <div className="text-lg font-black text-white">{prediction.deviation_percentage}%</div>
                </div>
              </div>

              <div className="bg-black/40 rounded-lg p-4 border border-white/5">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-[10px] text-white/50">ESTIMATED DELAY</div>
                  <div className="text-xs font-bold text-red-400">+{prediction.estimated_delay} MINS</div>
                </div>
                <div className="w-full bg-white/10 rounded-full h-1.5 mb-1 overflow-hidden">
                  <div className="bg-red-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${Math.min(prediction.estimated_delay * 2, 100)}%` }}></div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-white/10 text-xs text-white/60">
                <span className="block text-[10px] text-white/40 mb-1">SUGGESTED ACTION</span>
                {prediction.suggested_action}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 opacity-50 text-xs text-white/50 font-mono text-center">
              <RefreshCw className="w-6 h-6 animate-spin mb-2" />
              WAITING FOR TELEMETRY...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

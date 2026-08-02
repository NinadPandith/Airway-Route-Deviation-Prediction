import React, { useEffect } from 'react';
import { MapContainer, Marker, TileLayer, Polyline, Tooltip, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

import {
  Activity, Compass, PlaneTakeoff, RefreshCw, Cloud, MapPin, 
  Clock, Play, Pause, Square, FastForward, Flag, Route as RouteIcon,
  BarChart3, RotateCcw
} from 'lucide-react';

import { useSimulation, getClosestPointOnSegment, haversine, calculateBearing } from '../context/SimulationContext';

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

export default function SimulationMode({ showNotification }) {
  const {
    flights,
    selectedFlight,
    setSelectedFlight,
    status,
    setStatus,
    speedMult,
    cycleSpeed,
    startSession,
    stopSession,
    simAircraft,
    destination,
    prediction,
    history,
    progressData,
    analytics,
    timeElapsed
  } = useSimulation();

  const handleSelectFlight = (e) => {
    const id = parseInt(e.target.value);
    const flight = flights.find(f => f.id === id);
    setSelectedFlight(flight);
    if (flight && status !== 'playing') {
      stopSession(); // ensure clean state if picking new while stopped
    }
  };

  const handleStart = () => {
    if (selectedFlight) {
      startSession(selectedFlight);
      showNotification('success', `Simulation Started: ${selectedFlight.origin} to ${selectedFlight.destination}`);
    }
  };

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

  const MetricRow = ({ label, value, unit, highlight = false }) => (
    <div className="flex justify-between items-start py-1 border-b border-white/5 last:border-0 min-h-0 gap-2 overflow-hidden flex-wrap sm:flex-nowrap">
      <span className="text-white/50 text-xs shrink-0">{label}</span>
      <span className={`text-sm font-mono break-all text-right ${highlight ? 'text-secondary font-bold' : 'text-white'}`}>
        {value} {unit && <span className="text-[10px] text-white/40 ml-1">{unit}</span>}
      </span>
    </div>
  );

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col xl:flex-row gap-4 w-full">
      {/* MAP VIEW */}
      <div className="flex-1 rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative bg-dark">
        {/* Top Controls Overlay */}
        <div className="absolute top-4 left-4 right-4 z-[1000] flex justify-between items-start pointer-events-none flex-wrap gap-2">
          <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-xl pointer-events-auto flex flex-wrap items-center gap-3">
            <select 
              className="bg-black/30 border border-white/20 text-white rounded-lg px-3 py-1.5 text-sm outline-none max-w-xs focus:border-secondary transition-colors"
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
                onClick={handleStart}
                className="bg-secondary text-dark px-4 py-1.5 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-secondary/90 transition-colors shadow-[0_0_15px_rgba(34,211,238,0.4)] whitespace-nowrap"
              >
                <Play className="w-4 h-4" /> {status === 'completed' ? 'Restart' : 'Start Simulation'}
              </button>
            )}
            
            {status !== 'stopped' && status !== 'completed' && (
              <div className="flex items-center gap-2 border-l border-white/20 pl-3">
                <button onClick={() => setStatus(status === 'playing' ? 'paused' : 'playing')} className="p-1.5 bg-white/10 rounded-lg hover:bg-white/20 text-white transition-colors">
                  {status === 'playing' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button onClick={stopSession} className="p-1.5 bg-white/10 rounded-lg hover:bg-red-500/80 text-white transition-colors">
                  <Square className="w-4 h-4" />
                </button>
                <button onClick={cycleSpeed} className="px-2 py-1.5 bg-secondary/20 border border-secondary/50 rounded-lg hover:bg-secondary/40 text-secondary flex items-center font-bold text-xs w-20 justify-center transition-colors shadow-inner">
                  <FastForward className="w-3 h-3 mr-1" /> {speedMult}x
                </button>
              </div>
            )}
          </div>
          
          <div className="flex flex-col gap-2 pointer-events-auto">
             <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2 font-mono text-xs text-white/80 shadow-lg flex items-center gap-2">
                <Clock className="w-3 h-3 text-secondary shrink-0" /> <span className="truncate">SIM TIME: {Math.floor(timeElapsed / 60)}m {Math.floor(timeElapsed % 60)}s</span>
             </div>
             {simAircraft && (
               <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2 font-mono text-xs text-white/80 shadow-lg flex items-center gap-2">
                  <PlaneTakeoff className="w-3 h-3 text-secondary shrink-0" /> PHASE: <span className="text-white font-bold truncate">{simAircraft.phase}</span>
               </div>
             )}
          </div>
        </div>

        {/* Completion Modal */}
        {status === 'completed' && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-[2000] flex items-center justify-center pointer-events-auto p-4">
             <div className="bg-dark border border-white/20 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-[0_0_50px_rgba(34,211,238,0.2)] text-center overflow-y-auto max-h-[90vh]">
                <Flag className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h2 className="text-2xl font-black text-white mb-2">SIMULATION COMPLETED</h2>
                <p className="text-white/60 mb-6 text-sm">Aircraft has successfully reached its destination.</p>
                
                <div className="grid grid-cols-2 gap-4 mb-8 text-left">
                  <div className="bg-black/50 p-3 rounded-lg border border-white/5 flex flex-col justify-between">
                     <div className="text-[10px] text-white/50 mb-1 leading-tight">TOTAL FLIGHT TIME</div>
                     <div className="text-lg font-mono text-white truncate">{Math.floor(timeElapsed / 60)}m {Math.floor(timeElapsed % 60)}s</div>
                  </div>
                  <div className="bg-black/50 p-3 rounded-lg border border-white/5 flex flex-col justify-between">
                     <div className="text-[10px] text-white/50 mb-1 leading-tight">DISTANCE FLOWN</div>
                     <div className="text-lg font-mono text-white truncate">{Math.round(progressData.distanceCovered)} km</div>
                  </div>
                  <div className="bg-black/50 p-3 rounded-lg border border-white/5 flex flex-col justify-between">
                     <div className="text-[10px] text-white/50 mb-1 leading-tight">AVG GROUND SPEED</div>
                     <div className="text-lg font-mono text-white truncate">{Math.round(analytics.avgSpeedSum / Math.max(1, analytics.speedCount))} kt</div>
                  </div>
                  <div className="bg-black/50 p-3 rounded-lg border border-white/5 flex flex-col justify-between">
                     <div className="text-[10px] text-white/50 mb-1 leading-tight">MAX DEVIATION</div>
                     <div className="text-lg font-mono text-red-400 truncate">{analytics.maxDev.toFixed(2)} km</div>
                  </div>
                </div>

                <div className="flex justify-center gap-4 flex-wrap">
                   <button onClick={stopSession} className="px-6 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 font-bold transition-colors">Close</button>
                   <button onClick={handleStart} className="px-6 py-2 rounded-lg bg-secondary text-dark hover:bg-secondary/90 font-bold flex items-center gap-2 transition-colors"><RotateCcw className="w-4 h-4"/> Restart</button>
                </div>
             </div>
          </div>
        )}

        <MapContainer center={[20, 0]} zoom={3} className="w-full h-full bg-[#0a0a0a]" zoomControl={false} attributionControl={false}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png" maxZoom={19} />
          <ZoomControl position="bottomright" />
          
          {selectedFlight && destination && <MapController flight={selectedFlight} destination={destination} />}

          {plannedRouteCoords.length > 0 && (
            <Polyline positions={plannedRouteCoords} color="#3b82f6" weight={3} dashArray="8, 12" opacity={0.6} />
          )}

          {history.length > 0 && (
            <Polyline positions={history} color="#22c55e" weight={4} opacity={0.9} />
          )}

          {deviationVector && (
            <Polyline positions={deviationVector} color="#ef4444" weight={2} dashArray="4, 4" opacity={0.8} />
          )}

          {destination && (
            <>
              <Marker position={[destination.origin_lat, destination.origin_lon]} icon={createLabeledIcon(selectedFlight?.origin.split(' ')[0], '#3b82f6')} />
              <Marker position={[destination.destination_lat, destination.destination_lon]} icon={createLabeledIcon(selectedFlight?.destination.split(' ')[0], '#ef4444')} />
            </>
          )}

          {simAircraft && (
            <Marker position={[simAircraft.latitude, simAircraft.longitude]} icon={createAircraftIcon(simAircraft.heading, '#ffffff')} zIndexOffset={1000}>
              <Tooltip permanent direction="right" offset={[15, 0]} className="bg-black/80 backdrop-blur border border-white/20 text-white font-mono text-xs rounded shadow-lg px-2 py-1">
                <div className="font-bold text-secondary mb-1 whitespace-nowrap">{selectedFlight?.flight_number}</div>
                <div className="whitespace-nowrap">{Math.round(simAircraft.speed)}kt | FL{Math.round(simAircraft.altitude/100)}</div>
                <div className="text-[10px] text-white/50 whitespace-nowrap">{progressData.distanceRemaining.toFixed(0)} km to go</div>
              </Tooltip>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* DASHBOARD VIEW - FIXED HEIGHT / RESPONSIVE OVERFLOW */}
      <div className="w-full xl:w-[450px] shrink-0 flex flex-col h-full bg-dark/60 backdrop-blur-xl rounded-2xl border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-y-auto no-scrollbar relative p-4 gap-4">
        <h2 className="text-xl font-black text-white flex items-center gap-2 shrink-0">
          <BarChart3 className="w-5 h-5 text-secondary" /> AVIATION METRICS
        </h2>

        {/* 1. FLIGHT PROGRESS */}
        <div className="bg-black/40 rounded-xl p-4 border border-white/5 relative shrink-0">
          <div className="absolute top-0 left-0 w-1 bg-blue-500 h-full rounded-l-xl"></div>
          <h3 className="text-[10px] font-bold text-white/50 mb-3 tracking-widest flex items-center gap-2">
            <RouteIcon className="w-3 h-3 shrink-0" /> FLIGHT PROGRESS
          </h3>
          
          <div className="mb-4">
             <div className="flex justify-between items-end mb-1 gap-2 flex-wrap">
                <span className="text-2xl font-black text-white shrink-0">{progressData.progressPercent.toFixed(1)}%</span>
                <span className="text-xs font-mono text-blue-400 break-words text-right">ETA: {Math.floor(progressData.etaMinutes/60)}h {Math.floor(progressData.etaMinutes%60)}m</span>
             </div>
             <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
               <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progressData.progressPercent}%` }}></div>
             </div>
          </div>
          
          <div className="flex flex-col gap-1">
            <MetricRow label="Total Route Distance" value={Math.round(progressData.totalDistance)} unit="km" />
            <MetricRow label="Distance Covered" value={Math.round(progressData.distanceCovered)} unit="km" highlight />
            <MetricRow label="Distance Remaining" value={Math.round(progressData.distanceRemaining)} unit="km" />
          </div>
        </div>

        {/* 2. TELEMETRY */}
        <div className="bg-black/40 rounded-xl p-4 border border-white/5 relative shrink-0">
          <div className="absolute top-0 left-0 w-1 bg-secondary h-full rounded-l-xl"></div>
          <h3 className="text-[10px] font-bold text-white/50 mb-3 tracking-widest flex items-center gap-2">
            <Compass className="w-3 h-3 shrink-0" /> TELEMETRY
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
             <div className="flex flex-col gap-1">
                <MetricRow label="Latitude" value={simAircraft?.latitude.toFixed(4) || '---'} />
                <MetricRow label="Longitude" value={simAircraft?.longitude.toFixed(4) || '---'} />
                <MetricRow label="Ground Speed" value={simAircraft ? Math.round(simAircraft.speed) : '---'} unit="kt" highlight />
                <MetricRow label="Air Speed" value={simAircraft ? Math.round(simAircraft.speed * 1.05) : '---'} unit="kt" />
             </div>
             <div className="flex flex-col gap-1">
                <MetricRow label="Altitude" value={simAircraft ? Math.round(simAircraft.altitude) : '---'} unit="ft" highlight />
                <MetricRow label="Vertical Spd" value={simAircraft ? Math.round(simAircraft.vertical_speed) : '---'} unit="fpm" />
                <MetricRow label="Heading" value={simAircraft ? Math.round(simAircraft.heading) : '---'} unit="°" />
                <MetricRow label="Bearing" value={destination && simAircraft ? Math.round(calculateBearing(simAircraft.latitude, simAircraft.longitude, destination.destination_lat, destination.destination_lon)) : '---'} unit="°" />
             </div>
          </div>
        </div>

        {/* 3. ROUTE ANALYSIS */}
        <div className="bg-black/40 rounded-xl p-4 border border-white/5 relative shrink-0">
          <div className="absolute top-0 left-0 w-1 bg-green-500 h-full rounded-l-xl"></div>
          <h3 className="text-[10px] font-bold text-white/50 mb-3 tracking-widest flex items-center gap-2">
            <MapPin className="w-3 h-3 shrink-0" /> ROUTE ANALYSIS
          </h3>
          <div className="flex flex-col gap-1">
            <MetricRow label="Route Status" value={crossTrackError > 5 ? 'Deviating' : 'On Track'} highlight />
            <MetricRow label="Cross Track Error" value={crossTrackError.toFixed(2)} unit="km" />
            <MetricRow label="Deviation %" value={prediction ? prediction.deviation_percentage : '0.00'} unit="%" />
          </div>
        </div>

        {/* 4. MACHINE LEARNING ENGINE */}
        <div className="bg-black/40 rounded-xl p-4 border border-white/5 relative group shrink-0">
          <div className="absolute -right-10 -bottom-10 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none"><Activity className="w-40 h-40" /></div>
          <div className="absolute top-0 left-0 w-1 bg-purple-500 h-full rounded-l-xl"></div>
          
          <h3 className="text-[10px] font-bold text-white/50 mb-3 tracking-widest flex items-center gap-2 relative z-10">
            <Activity className="w-3 h-3 shrink-0" /> ML PREDICTION ENGINE
          </h3>
          
          {prediction ? (
            <div className="relative z-10 flex flex-col gap-1">
              <div className="grid grid-cols-2 gap-3 mb-2">
                <div className="bg-black/50 rounded-lg p-3 border border-white/5 shadow-inner flex flex-col justify-center">
                  <div className="text-[10px] text-white/50 mb-1 truncate">RISK LEVEL</div>
                  <div className={`text-base sm:text-lg font-black truncate ${
                    prediction.risk_level === 'High Risk' ? 'text-red-500' :
                    prediction.risk_level === 'Medium Risk' ? 'text-orange-400' : 'text-green-400'
                  }`}>{prediction.risk_level}</div>
                </div>
                <div className="bg-black/50 rounded-lg p-3 border border-white/5 shadow-inner flex flex-col justify-center">
                  <div className="text-[10px] text-white/50 mb-1 truncate">CONFIDENCE</div>
                  <div className="text-base sm:text-lg font-black text-white truncate">{prediction.confidence_score}%</div>
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
        <div className="bg-black/40 rounded-xl p-4 border border-white/5 relative shrink-0">
          <div className="absolute top-0 left-0 w-1 bg-yellow-500 h-full rounded-l-xl"></div>
          <h3 className="text-[10px] font-bold text-white/50 mb-3 tracking-widest flex items-center gap-2">
            <Cloud className="w-3 h-3 shrink-0" /> WEATHER ENVIRONMENT
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
            <div className="flex flex-col gap-1">
              <MetricRow label="Condition" value={prediction?.weather_risk || 'Clear'} highlight />
              <MetricRow label="Temperature" value={simAircraft?.temperature.toFixed(1) || '---'} unit="°C" />
              <MetricRow label="Visibility" value="10" unit="km" />
            </div>
            <div className="flex flex-col gap-1">
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

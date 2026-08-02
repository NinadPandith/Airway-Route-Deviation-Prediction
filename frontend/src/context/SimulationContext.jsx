import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const API_BASE_URL = 'http://127.0.0.1:8000';

export const toRad = (value) => (value * Math.PI) / 180;
export const toDeg = (value) => (value * 180) / Math.PI;

export const haversine = (lat1, lon1, lat2, lon2) => {
  const r = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)*Math.sin(dLon/2);
  return 2 * r * Math.asin(Math.sqrt(a));
};

export const calculateBearing = (startLat, startLng, destLat, destLng) => {
  const startLatRad = toRad(startLat);
  const startLngRad = toRad(startLng);
  const destLatRad = toRad(destLat);
  const destLngRad = toRad(destLng);
  const y = Math.sin(destLngRad - startLngRad) * Math.cos(destLatRad);
  const x = Math.cos(startLatRad) * Math.sin(destLatRad) -
            Math.sin(startLatRad) * Math.cos(destLatRad) * Math.cos(destLngRad - startLngRad);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
};

export const getClosestPointOnSegment = (p, p1, p2) => {
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

const SimulationContext = createContext(null);

export const useSimulation = () => useContext(SimulationContext);

export const SPEED_OPTIONS = [1, 2, 5, 10, 20, 30, 50, 75, 100, 250, 500, 1000];

export const SimulationProvider = ({ children }) => {
  // Available manual flights
  const [flights, setFlights] = useState([]);
  
  // Selected flight for setup
  const [selectedFlight, setSelectedFlight] = useState(null);
  
  // Core Session state
  const [status, setStatus] = useState('stopped'); // stopped, playing, paused, completed
  const [speedMult, setSpeedMult] = useState(1);
  const [session, setSession] = useState(null);
  
  // Dynamic Entities
  const [simAircraft, setSimAircraft] = useState(null);
  const [destination, setDestination] = useState(null); // Now holds the complex weather route payload
  const [prediction, setPrediction] = useState(null);
  const [history, setHistory] = useState([]); 
  
  // Metrics
  const [progressData, setProgressData] = useState({
    distanceCovered: 0,
    distanceRemaining: 0,
    totalDistance: 0,
    progressPercent: 0,
    etaMinutes: 0
  });

  const [analytics, setAnalytics] = useState({
    maxDev: 0,
    maxAlt: 0,
    avgSpeedSum: 0,
    speedCount: 0,
    weatherZonesCrossed: 0,
    weatherImpactScore: 0,
    weatherDelaySecs: 0,
    maxWind: 0,
    worstWeather: 'Clear'
  });

  const [timeElapsed, setTimeElapsed] = useState(0);

  // Refs for animation & mutable access inside loop
  const requestRef = useRef();
  const lastTimeRef = useRef();
  const simStateRef = useRef();
  const destRef = useRef();
  const statusRef = useRef('stopped');
  const speedRef = useRef(1);

  // Sync refs when state changes
  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { speedRef.current = speedMult; }, [speedMult]);
  useEffect(() => { destRef.current = destination; }, [destination]);

  // Load flights initially
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/flights?status=all&limit=200`)
      .then(r => r.json())
      .then(data => setFlights(data))
      .catch(e => console.error('Failed to fetch manual flights.'));
  }, []);

  // Hydrate from sessionStorage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem('sim_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.status !== 'stopped') {
          setSelectedFlight(parsed.selectedFlight);
          setStatus(parsed.status);
          setSpeedMult(parsed.speedMult || 1);
          setSession(parsed.session);
          setSimAircraft(parsed.simAircraft);
          simStateRef.current = parsed.simAircraft;
          setDestination(parsed.destination);
          setPrediction(parsed.prediction);
          setHistory(parsed.history || []);
          setProgressData(parsed.progressData);
          setAnalytics(parsed.analytics || { maxDev: 0, maxAlt: 0, avgSpeedSum: 0, speedCount: 0, weatherZonesCrossed: 0, weatherImpactScore: 0, weatherDelaySecs: 0, maxWind: 0, worstWeather: 'Clear' });
          setTimeElapsed(parsed.timeElapsed || 0);
        }
      } catch (e) {
        console.error('Failed to hydrate simulation from storage', e);
      }
    }
  }, []);

  // Save to sessionStorage when critical state updates
  useEffect(() => {
    if (status !== 'stopped') {
      const payload = {
        selectedFlight,
        status,
        speedMult,
        session,
        simAircraft,
        destination,
        prediction,
        history,
        progressData,
        analytics,
        timeElapsed
      };
      sessionStorage.setItem('sim_session', JSON.stringify(payload));
    } else {
      sessionStorage.removeItem('sim_session');
    }
  }, [status, speedMult, simAircraft, history, progressData, prediction]);

  const startSession = async (flight) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/simulation/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flight_id: flight.id })
      });
      const sess = await res.json();
      setSession(sess);
      
      const routeRes = await fetch(`${API_BASE_URL}/api/simulation/${flight.id}/weather-route`);
      const routeData = await routeRes.json();
      setDestination(routeData);
      destRef.current = routeData;
      
      // Calculate total segmented distance
      let totalDist = 0;
      const optRoute = routeData.optimized_route;
      for (let i = 0; i < optRoute.length - 1; i++) {
        totalDist += haversine(optRoute[i].lat, optRoute[i].lon, optRoute[i+1].lat, optRoute[i+1].lon);
      }
      
      const initialWeather = optRoute[0].weather || {};

      const initialAircraft = {
        latitude: routeData.origin_lat,
        longitude: routeData.origin_lon,
        altitude: 0,
        vertical_speed: 0,
        speed: 150,
        heading: calculateBearing(routeData.origin_lat, routeData.origin_lon, optRoute[1].lat, optRoute[1].lon),
        wind_speed: initialWeather.wind_speed || 0,
        wind_direction: initialWeather.wind_direction || 0,
        weather_severity: (initialWeather.weather_code || 0) / 100.0,
        temperature: initialWeather.temperature || 15,
        pressure: initialWeather.pressure || 1013,
        visibility: initialWeather.visibility || 10000,
        phase: 'Taxi',
        prev_latitude: routeData.origin_lat,
        prev_longitude: routeData.origin_lon,
        currentWaypointIndex: 0
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
      setAnalytics({ 
        maxDev: 0, 
        maxAlt: 0, 
        avgSpeedSum: 0, 
        speedCount: 0,
        weatherZonesCrossed: 1,
        weatherImpactScore: 0,
        weatherDelaySecs: 0,
        maxWind: initialWeather.wind_speed || 0,
        worstWeather: initialWeather.weather_description || 'Clear'
      });
    } catch (e) {
      console.error('Failed to start session', e);
    }
  };

  const stopSession = () => {
    setStatus('stopped');
    setSession(null);
    setDestination(null);
    setSimAircraft(null);
    setHistory([]);
    setPrediction(null);
    setTimeElapsed(0);
  };

  const cycleSpeed = () => {
    const idx = SPEED_OPTIONS.indexOf(speedMult);
    const nextIdx = (idx + 1) % SPEED_OPTIONS.length;
    setSpeedMult(SPEED_OPTIONS[nextIdx]);
  };

  // The Physics Loop
  const updateSimulation = (time) => {
    if (statusRef.current !== 'playing' || !simStateRef.current || !destRef.current) {
      if (statusRef.current === 'playing') requestRef.current = requestAnimationFrame(updateSimulation);
      return;
    }

    if (lastTimeRef.current !== undefined) {
      const deltaTime = (time - lastTimeRef.current) / 1000;
      const simTimeDelta = deltaTime * speedRef.current;
      
      const current = simStateRef.current;
      const dest = destRef.current;
      const optRoute = dest.optimized_route;
      
      // Calculate total segment distance dynamically based on index
      let distCovered = 0;
      for (let i = 0; i < current.currentWaypointIndex; i++) {
        distCovered += haversine(optRoute[i].lat, optRoute[i].lon, optRoute[i+1].lat, optRoute[i+1].lon);
      }
      const distFromLastWp = haversine(optRoute[current.currentWaypointIndex].lat, optRoute[current.currentWaypointIndex].lon, current.latitude, current.longitude);
      distCovered += distFromLastWp;

      let totalDist = 0;
      for (let i = 0; i < optRoute.length - 1; i++) {
        totalDist += haversine(optRoute[i].lat, optRoute[i].lon, optRoute[i+1].lat, optRoute[i+1].lon);
      }
      
      const distRemaining = totalDist - distCovered;
      const progress = (distCovered / totalDist) * 100;
      
      if (progress >= 99.8 || current.currentWaypointIndex >= optRoute.length - 1 || distRemaining < 2) {
        setStatus('completed');
        return;
      }

      // Check if we reached the next waypoint
      let targetWp = optRoute[current.currentWaypointIndex + 1];
      const distToTarget = haversine(current.latitude, current.longitude, targetWp.lat, targetWp.lon);
      
      let nextWpIdx = current.currentWaypointIndex;
      let weatherZonesCrossedDelta = 0;
      if (distToTarget < 5.0 && current.currentWaypointIndex < optRoute.length - 2) {
        nextWpIdx++;
        targetWp = optRoute[nextWpIdx + 1];
        weatherZonesCrossedDelta = 1;
      }

      // Current Weather Extraction
      const activeWeather = optRoute[nextWpIdx].weather || {};

      let phase = 'Taxi';
      let targetAlt = 35000;
      let targetSpeed = 450; // base speed
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

      // ----------------------------------------------------
      // Weather Impact on Physics
      // ----------------------------------------------------
      const windSpd = activeWeather.wind_speed || 0; // m/s
      const windDir = activeWeather.wind_direction || 0; // deg
      const idealHeading = calculateBearing(current.latitude, current.longitude, targetWp.lat, targetWp.lon);
      
      // Calculate wind tail/head vector
      // 0 = tailwind (adds to speed), 180 = headwind (reduces speed)
      const relativeWindAngle = Math.abs(windDir - idealHeading) % 360;
      const windEffectFactor = Math.cos(toRad(relativeWindAngle)); 
      
      // Convert wind m/s to knots for speed adjustment (1 m/s = 1.94384 knots)
      const windKnots = windSpd * 1.94384;
      
      // Adjust target speed based on wind
      // Tailwind pushes, Headwind resists
      targetSpeed += (windKnots * windEffectFactor);
      
      // Severe weather code reduces target speed
      const wcode = activeWeather.weather_code || 0;
      let weatherDelayDelta = 0;
      if (wcode >= 95) { // thunderstorm
          targetSpeed -= 50; 
          weatherDelayDelta = simTimeDelta * 0.2; // 20% delay penalty
      } else if (wcode >= 61) { // rain
          targetSpeed -= 20;
          weatherDelayDelta = simTimeDelta * 0.05;
      }

      // Smooth altitude transitions
      const altDiff = targetAlt - current.altitude;
      const newAlt = Math.max(0, current.altitude + (altDiff > 0 ? 1 : -1) * Math.min(Math.abs(altDiff), 50 * simTimeDelta));
      
      // Smooth speed transitions
      const speedDiff = targetSpeed - current.speed;
      const newSpeed = current.speed + (speedDiff > 0 ? 1 : -1) * Math.min(Math.abs(speedDiff), 2 * simTimeDelta);

      const speedKmH = newSpeed * 1.852;
      const speedKmS = speedKmH / 3600;
      const distanceMovedKm = speedKmS * simTimeDelta;
      
      const distDeg = distanceMovedKm / 111.0;
      
      // Deviation flutter depending on weather severity
      const wSev = wcode >= 95 ? 3.0 : (wcode >= 61 ? 1.0 : 0.0);
      const deviationAmt = (Math.random() - 0.5) * (1.5 + wSev); 
      const newHeading = (idealHeading + deviationAmt + 360) % 360;
      const headingRad = toRad(newHeading);
      
      const newLat = current.latitude + distDeg * Math.cos(headingRad);
      const newLon = current.longitude + distDeg * Math.sin(headingRad);
      
      const updated = {
        ...current,
        latitude: newLat,
        longitude: newLon,
        altitude: newAlt,
        speed: newSpeed,
        vertical_speed: (newAlt - current.altitude) / Math.max(0.001, simTimeDelta) * 60,
        heading: newHeading,
        phase: phase,
        prev_latitude: current.latitude,
        prev_longitude: current.longitude,
        currentWaypointIndex: nextWpIdx,
        
        // Update current weather payload for UI
        temperature: activeWeather.temperature || current.temperature,
        wind_speed: windSpd,
        wind_direction: windDir,
        weather_severity: (wcode / 100.0) + (windSpd / 50.0) // Custom severity score for ML
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

      setAnalytics(prev => {
        let worst = prev.worstWeather;
        let impactScore = prev.weatherImpactScore;
        const currentDesc = activeWeather.weather_description || 'Clear';
        if (wcode > 0 && wcode > (prev._lastCode || 0)) {
           worst = currentDesc;
        }
        
        impactScore += (wcode / 100.0) * simTimeDelta;

        return {
          maxAlt: Math.max(prev.maxAlt, newAlt),
          avgSpeedSum: prev.avgSpeedSum + newSpeed,
          speedCount: prev.speedCount + 1,
          maxDev: prev.maxDev, // updated in telemetry fetch
          weatherZonesCrossed: prev.weatherZonesCrossed + weatherZonesCrossedDelta,
          weatherDelaySecs: prev.weatherDelaySecs + weatherDelayDelta,
          maxWind: Math.max(prev.maxWind, windSpd),
          worstWeather: worst,
          weatherImpactScore: impactScore,
          _lastCode: wcode
        };
      });
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
  }, [status]);
  
  // Telemetry POST (capped at 1s real-time to avoid spam at 1000x)
  useEffect(() => {
    if (status !== 'playing' || !simAircraft || !session || !destination) return;
    
    const interval = setInterval(() => {
      const current = simStateRef.current;
      if(!current) return;
      
      const payload = {
        session_id: session.id,
        latitude: current.latitude,
        longitude: current.longitude,
        altitude: current.altitude,
        speed: current.speed,
        heading: current.heading,
        weather_severity: current.weather_severity,
        prev_latitude: current.prev_latitude,
        prev_longitude: current.prev_longitude,
        origin_lat: destination.origin_lat,
        origin_lon: destination.origin_lon,
        destination_lat: destination.destination_lat,
        destination_lon: destination.destination_lon,
        wind_speed: current.wind_speed,
        wind_direction: current.wind_direction
      };
      
      fetch(`${API_BASE_URL}/api/simulation/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(r => r.json())
      .then(data => {
        setPrediction(data);
        setHistory(prev => [...prev, [current.latitude, current.longitude]]);
        if (data.deviation_distance) {
          setAnalytics(prev => ({ ...prev, maxDev: Math.max(prev.maxDev, data.deviation_distance) }));
        }
      })
      .catch(e => console.error("Telemetry post failed", e));
      
    }, 1000);
    
    return () => clearInterval(interval);
  }, [status, session, destination]); 

  return (
    <SimulationContext.Provider value={{
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
      destination, // Contains optimized_route, original_route, weather_markers
      prediction,
      history,
      progressData,
      analytics,
      timeElapsed
    }}>
      {children}
    </SimulationContext.Provider>
  );
};

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plane,
  AlertTriangle,
  Clock,
  Gauge,
  ArrowUpRight,
  PlusCircle,
  Compass,
  RefreshCw,
  TrendingUp,
  Activity,
  CheckCircle2
} from 'lucide-react';
import { getFlights, getLiveDashboard } from '../services/api';

export default function Dashboard({ showNotification }) {
  const [flights, setFlights] = useState([]);
  const [liveStats, setLiveStats] = useState({
    total_live_aircraft: 0,
    average_speed: 0,
    average_altitude: 0,
    average_wind_speed: 0,
    weather_severity: 'Low',
    last_updated: null,
    status_message: 'Live telemetry is currently offline.'
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [flightData, dashboardData] = await Promise.all([getFlights(), getLiveDashboard()]);
      setFlights(flightData);
      setLiveStats(dashboardData);
    } catch (err) {
      console.error('Failed to load dashboard flights:', err);
      if (showNotification) {
        showNotification('error', 'Failed to fetch flight telemetry from server.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Compute summary metrics
  const totalFlights = flights.length;
  const inFlightCount = flights.filter((f) => f.status === 'In Flight').length;
  const deviatedCount = flights.filter((f) => f.status === 'Deviated').length;
  const delayedCount = flights.filter((f) => f.status === 'Delayed').length;
  const landedCount = flights.filter((f) => f.status === 'Landed').length;

  const avgSpeed = totalFlights
    ? Math.round(flights.reduce((acc, f) => acc + (f.speed || 0), 0) / totalFlights)
    : 0;

  const avgAltitude = totalFlights
    ? Math.round(flights.reduce((acc, f) => acc + (f.altitude || 0), 0) / totalFlights)
    : 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-bold font-heading text-white flex items-center gap-2">
            Airway Control Dashboard
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Real-time flight telemetry monitoring, speed & altitude analytics, and route status updates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link
            to="/add-flight"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add New Flight</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Flights */}
        <div className="p-5 rounded-2xl glass-card relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider">Total Active Routes</span>
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:scale-110 transition-transform">
              <Plane className="w-5 h-5 transform -rotate-45" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div className="text-3xl font-extrabold font-heading text-white">{totalFlights}</div>
            <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> Live System
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Monitored in database</p>
        </div>

        {/* Card 2: In Flight */}
        <div className="p-5 rounded-2xl glass-card relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider">In-Flight Telemetry</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div className="text-3xl font-extrabold font-heading text-emerald-400">{inFlightCount}</div>
            <span className="text-xs text-emerald-400 font-mono">
              {totalFlights ? Math.round((inFlightCount / totalFlights) * 100) : 0}% Active
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Cruising airborne flights</p>
        </div>

        {/* Card 3: Deviated / Delayed */}
        <div className="p-5 rounded-2xl glass-card relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider">Deviations & Delays</span>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div className="text-3xl font-extrabold font-heading text-amber-400">
              {deviatedCount + delayedCount}
            </div>
            <span className="text-xs font-mono text-amber-400">
              {deviatedCount} Deviated / {delayedCount} Delayed
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Requires airway inspection</p>
        </div>

        {/* Card 4: Avg Telemetry Speed / Altitude */}
        <div className="p-5 rounded-2xl glass-card relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider">Avg Speed & Alt</span>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:scale-110 transition-transform">
              <Gauge className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div className="text-2xl font-bold font-heading text-white">{avgSpeed} <span className="text-xs font-normal text-slate-400">kts</span></div>
            <div className="text-xs font-mono text-cyan-400">{avgAltitude.toLocaleString()} <span className="text-[10px] text-slate-400">ft</span></div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Fleet average metrics</p>
        </div>
      </div>

      {/* Live Integration Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl glass-card border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold font-heading text-white">Live Integration Snapshot</h3>
              <p className="text-xs text-slate-400">OpenSky + OpenWeather live telemetry overview</p>
            </div>
            <div className="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-[10px] font-mono border border-cyan-500/20">
              {liveStats.weather_severity}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
              <div className="text-[10px] uppercase text-slate-500 font-mono">Live Aircraft</div>
              <div className="text-xl font-bold text-white mt-1">{liveStats.total_live_aircraft}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
              <div className="text-[10px] uppercase text-slate-500 font-mono">Avg Speed</div>
              <div className="text-xl font-bold text-cyan-400 mt-1">{liveStats.average_speed.toFixed(1)} kts</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
              <div className="text-[10px] uppercase text-slate-500 font-mono">Avg Altitude</div>
              <div className="text-xl font-bold text-white mt-1">{liveStats.average_altitude.toFixed(0)} ft</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
              <div className="text-[10px] uppercase text-slate-500 font-mono">Avg Wind</div>
              <div className="text-xl font-bold text-amber-400 mt-1">{liveStats.average_wind_speed.toFixed(1)} m/s</div>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-card border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-cyan-400">
            <Clock className="w-4 h-4" />
            <h3 className="text-sm font-semibold font-heading text-white">Status & Timing</h3>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 text-sm text-slate-300">
            <div className="text-[10px] uppercase text-slate-500 font-mono mb-1">Last Updated</div>
            <div className="font-semibold text-white">
              {liveStats.last_updated ? new Date(liveStats.last_updated).toLocaleString() : 'Awaiting first refresh'}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 text-sm text-slate-300">
            <div className="text-[10px] uppercase text-slate-500 font-mono mb-1">System Status</div>
            <div className="font-semibold text-white">{liveStats.status_message || 'Live telemetry available.'}</div>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Radar + Recent Flights Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Stylized Radar & Status Distribution (1 col) */}
        <div className="p-5 rounded-2xl glass-card border border-slate-800 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold font-heading text-white flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-400" /> Airway Radar Monitor
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
              SCANNING
            </span>
          </div>

          {/* Animated Radar Circle */}
          <div className="relative w-48 h-48 mx-auto rounded-full border-2 border-cyan-500/30 bg-slate-950/80 flex items-center justify-center overflow-hidden shadow-inner">
            {/* Grid circles */}
            <div className="absolute inset-4 rounded-full border border-cyan-500/20"></div>
            <div className="absolute inset-12 rounded-full border border-cyan-500/20"></div>
            <div className="absolute inset-20 rounded-full border border-cyan-500/20"></div>
            <div className="absolute w-full h-[1px] bg-cyan-500/20"></div>
            <div className="absolute h-full w-[1px] bg-cyan-500/20"></div>

            {/* Radar Sweeping Hand */}
            <div className="absolute inset-0 animate-radar-sweep origin-center">
              <div className="w-1/2 h-1/2 bg-gradient-to-br from-cyan-400/40 to-transparent origin-bottom-right rounded-tl-full"></div>
            </div>

            {/* Simulated aircraft blips */}
            <div className="absolute top-10 left-12 w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
            <div className="absolute top-10 left-12 w-2 h-2 rounded-full bg-emerald-400"></div>
            
            <div className="absolute bottom-12 right-14 w-2 h-2 rounded-full bg-amber-400 animate-pulse"></div>
            
            <div className="absolute top-20 right-10 w-2 h-2 rounded-full bg-cyan-400"></div>

            {/* Center radar hub */}
            <div className="relative z-10 text-center">
              <div className="text-lg font-bold font-mono text-cyan-300">{inFlightCount}</div>
              <div className="text-[9px] font-mono text-slate-400 uppercase">ACTIVE RADAR</div>
            </div>
          </div>

          {/* Status Breakdown Pills */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span> In Flight
              </span>
              <span className="font-mono text-slate-400 font-semibold">{inFlightCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span> Deviated Route
              </span>
              <span className="font-mono text-slate-400 font-semibold">{deviatedCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-rose-400"></span> Delayed
              </span>
              <span className="font-mono text-slate-400 font-semibold">{delayedCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span> Landed
              </span>
              <span className="font-mono text-slate-400 font-semibold">{landedCount}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Flights Stream (2 cols) */}
        <div className="lg:col-span-2 p-5 rounded-2xl glass-card border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold font-heading text-white">Recent Flight Telemetry</h3>
              <p className="text-xs text-slate-400">Latest active route logs in airway.db</p>
            </div>
            <Link
              to="/flights"
              className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-500 text-xs font-mono animate-pulse">
              Loading flight data...
            </div>
          ) : flights.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <Plane className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-slate-400 text-xs">No flights found in database.</p>
              <Link
                to="/add-flight"
                className="inline-block px-3 py-1.5 rounded-lg bg-cyan-600 text-white text-xs font-medium"
              >
                Create First Flight
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/80 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Flight #</th>
                    <th className="py-2.5 px-3">Aircraft</th>
                    <th className="py-2.5 px-3">Route</th>
                    <th className="py-2.5 px-3">Altitude / Speed</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {flights.slice(0, 5).map((flight) => (
                    <tr key={flight.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-3 font-semibold text-white">
                        {flight.flight_number}
                      </td>
                      <td className="py-3 px-3 text-slate-300 font-sans">
                        {flight.aircraft_name}
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        <span className="text-cyan-400">{flight.origin}</span> →{' '}
                        <span className="text-slate-200">{flight.destination}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-400">
                        {flight.altitude.toLocaleString()} ft / {flight.speed} kts
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={flight.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Status badge helper component
export function StatusBadge({ status }) {
  let styles = 'bg-slate-800 text-slate-300 border-slate-700';

  if (status === 'In Flight') {
    styles = 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30';
  } else if (status === 'Deviated') {
    styles = 'bg-amber-950/80 text-amber-400 border-amber-500/30 animate-pulse';
  } else if (status === 'Delayed') {
    styles = 'bg-rose-950/80 text-rose-400 border-rose-500/30';
  } else if (status === 'Landed') {
    styles = 'bg-blue-950/80 text-blue-400 border-blue-500/30';
  }

  return (
    <span className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-medium border ${styles} inline-flex items-center gap-1.5`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
      {status}
    </span>
  );
}

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
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/50">
        <div>
          <h2 className="text-3xl font-extrabold font-heading text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 flex items-center gap-3">
            Airway Control Dashboard
          </h2>
          <p className="text-slate-400 text-sm mt-1.5 font-light tracking-wide">
            Real-time flight telemetry monitoring, speed & altitude analytics, and route status updates.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="group flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-700/50 text-slate-300 text-sm font-medium transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-cyan-400 group-hover:rotate-180 transition-transform duration-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>

          <Link
            to="/add-flight"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-sm font-bold shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_25px_rgba(34,211,238,0.5)] transition-all transform hover:-translate-y-0.5"
          >
            <PlusCircle className="w-4.5 h-4.5" />
            <span>Add New Flight</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Total Flights */}
        <div className="p-6 rounded-2xl glass-card relative overflow-hidden group hover:border-cyan-500/50">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">Total Active Routes</span>
            <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:scale-110 transition-transform duration-300 shadow-inner">
              <Plane className="w-5 h-5 transform -rotate-45 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div className="text-4xl font-extrabold font-heading text-white tracking-tight">{totalFlights}</div>
            <span className="text-xs text-emerald-400 font-mono font-bold flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              <TrendingUp className="w-3.5 h-3.5" /> Live
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-3">Monitored in database</p>
        </div>

        {/* Card 2: In Flight */}
        <div className="p-6 rounded-2xl glass-card relative overflow-hidden group hover:border-emerald-500/50">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">In-Flight Telemetry</span>
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform duration-300 shadow-inner">
              <Activity className="w-5 h-5 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div className="text-4xl font-extrabold font-heading text-emerald-400 tracking-tight drop-shadow-sm">{inFlightCount}</div>
            <span className="text-xs text-emerald-400 font-mono font-bold">
              {totalFlights ? Math.round((inFlightCount / totalFlights) * 100) : 0}% Active
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-3">Cruising airborne flights</p>
        </div>

        {/* Card 3: Deviated / Delayed */}
        <div className="p-6 rounded-2xl glass-card relative overflow-hidden group hover:border-amber-500/50">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">Deviations & Delays</span>
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-110 transition-transform duration-300 shadow-inner">
              <AlertTriangle className="w-5 h-5 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div className="text-4xl font-extrabold font-heading text-amber-400 tracking-tight drop-shadow-sm">
              {deviatedCount + delayedCount}
            </div>
            <span className="text-[10px] font-mono font-bold text-amber-400/80 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
              {deviatedCount} DEV / {delayedCount} DLY
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-3">Requires airway inspection</p>
        </div>

        {/* Card 4: Avg Telemetry Speed / Altitude */}
        <div className="p-6 rounded-2xl glass-card relative overflow-hidden group hover:border-indigo-500/50">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-400 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">Avg Speed & Alt</span>
            <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:scale-110 transition-transform duration-300 shadow-inner">
              <Gauge className="w-5 h-5 drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div className="text-3xl font-extrabold font-heading text-white tracking-tight">{avgSpeed} <span className="text-sm font-medium text-slate-500">kts</span></div>
            <div className="text-sm font-mono font-bold text-indigo-400">{avgAltitude.toLocaleString()} <span className="text-[10px] text-indigo-400/70">ft</span></div>
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-4">Fleet average metrics</p>
        </div>
      </div>

      {/* Live Integration Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl glass-panel space-y-5 shadow-[0_8px_30px_rgba(0,0,0,0.3)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none transform translate-x-1/2 -translate-y-1/2"></div>
          
          <div className="flex items-center justify-between relative z-10">
            <div>
              <h3 className="text-base font-bold font-heading text-white tracking-wide">Live Integration Snapshot</h3>
              <p className="text-xs text-slate-400 font-medium mt-1">OpenSky + OpenWeather live telemetry overview</p>
            </div>
            <div className="px-3 py-1.5 rounded-full bg-cyan-500/10 text-cyan-400 text-[11px] font-mono font-bold border border-cyan-500/20 shadow-[0_0_10px_rgba(34,211,238,0.1)]">
              {liveStats.weather_severity}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm relative z-10">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/50 shadow-inner group hover:bg-slate-800/60 transition-colors">
              <div className="text-[10px] uppercase text-slate-500 font-mono font-bold tracking-widest">Live Aircraft</div>
              <div className="text-2xl font-extrabold text-white mt-1.5 font-heading group-hover:text-cyan-400 transition-colors">{liveStats.total_live_aircraft}</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/50 shadow-inner group hover:bg-slate-800/60 transition-colors">
              <div className="text-[10px] uppercase text-slate-500 font-mono font-bold tracking-widest">Avg Speed</div>
              <div className="text-2xl font-extrabold text-cyan-400 mt-1.5 font-heading group-hover:scale-105 transition-transform origin-left">{liveStats.average_speed.toFixed(1)} kts</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/50 shadow-inner group hover:bg-slate-800/60 transition-colors">
              <div className="text-[10px] uppercase text-slate-500 font-mono font-bold tracking-widest">Avg Altitude</div>
              <div className="text-2xl font-extrabold text-white mt-1.5 font-heading group-hover:text-emerald-400 transition-colors">{liveStats.average_altitude.toFixed(0)} ft</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/50 shadow-inner group hover:bg-slate-800/60 transition-colors">
              <div className="text-[10px] uppercase text-slate-500 font-mono font-bold tracking-widest">Avg Wind</div>
              <div className="text-2xl font-extrabold text-amber-400 mt-1.5 font-heading group-hover:scale-105 transition-transform origin-left">{liveStats.average_wind_speed.toFixed(1)} m/s</div>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl glass-panel space-y-4 shadow-[0_8px_30px_rgba(0,0,0,0.3)] relative overflow-hidden">
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none transform -translate-x-1/2 translate-y-1/2"></div>
          
          <div className="flex items-center gap-2.5 text-cyan-400 relative z-10 mb-2">
            <Clock className="w-5 h-5 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]" />
            <h3 className="text-base font-bold font-heading text-white tracking-wide">Status & Timing</h3>
          </div>
          
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/50 shadow-inner relative z-10">
            <div className="text-[10px] uppercase text-slate-500 font-mono font-bold tracking-widest mb-1.5">Last Updated</div>
            <div className="font-bold text-white tracking-wide text-sm">
              {liveStats.last_updated ? new Date(liveStats.last_updated).toLocaleString() : 'Awaiting first refresh...'}
            </div>
          </div>
          
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/50 shadow-inner relative z-10">
            <div className="text-[10px] uppercase text-slate-500 font-mono font-bold tracking-widest mb-1.5">System Status</div>
            <div className="font-bold text-emerald-400 tracking-wide text-sm flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
               {liveStats.status_message || 'Live telemetry available.'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Radar + Recent Flights Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Stylized Radar & Status Distribution (1 col) */}
        <div className="p-6 rounded-2xl glass-panel space-y-6 shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold font-heading text-white flex items-center gap-2.5 tracking-wide">
              <Compass className="w-4.5 h-4.5 text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]" /> Airway Radar Monitor
            </h3>
            <span className="text-[9px] font-mono font-bold px-2.5 py-1 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_10px_rgba(34,211,238,0.1)] tracking-widest animate-pulse">
              SCANNING
            </span>
          </div>

          {/* Animated Radar Circle */}
          <div className="relative w-52 h-52 mx-auto rounded-full border-2 border-cyan-500/20 bg-slate-950/80 flex items-center justify-center overflow-hidden shadow-[inset_0_0_30px_rgba(34,211,238,0.1)]">
            {/* Grid circles */}
            <div className="absolute inset-5 rounded-full border border-cyan-500/10"></div>
            <div className="absolute inset-12 rounded-full border border-cyan-500/10"></div>
            <div className="absolute inset-[80px] rounded-full border border-cyan-500/10"></div>
            <div className="absolute w-full h-px bg-cyan-500/10"></div>
            <div className="absolute h-full w-px bg-cyan-500/10"></div>

            {/* Radar Sweeping Hand */}
            <div className="absolute inset-0 animate-radar-sweep origin-center">
              <div className="w-1/2 h-1/2 bg-[conic-gradient(from_180deg_at_100%_100%,rgba(34,211,238,0)_0deg,rgba(34,211,238,0.4)_90deg)] origin-bottom-right rounded-tl-full shadow-[0_0_15px_rgba(34,211,238,0.3)]"></div>
            </div>

            {/* Simulated aircraft blips */}
            <div className="absolute top-12 left-14 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-[ping_2s_ease-out_infinite]"></div>
            <div className="absolute top-12 left-14 w-2 h-2 rounded-full bg-emerald-400"></div>
            
            <div className="absolute bottom-14 right-16 w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)] animate-[pulse_1s_ease-out_infinite]"></div>
            
            <div className="absolute top-24 right-12 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></div>

            {/* Center radar hub */}
            <div className="relative z-10 text-center">
              <div className="text-2xl font-extrabold font-mono text-cyan-300 drop-shadow-md">{inFlightCount}</div>
              <div className="text-[9px] font-mono font-bold text-cyan-400/70 uppercase tracking-widest mt-1">ACTIVE RADAR</div>
            </div>
          </div>

          {/* Status Breakdown Pills */}
          <div className="space-y-3 pt-4 border-t border-slate-700/50 text-[11px] font-bold tracking-wide">
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/50 transition-colors cursor-default">
              <span className="flex items-center gap-3 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span> In Flight
              </span>
              <span className="font-mono text-emerald-400">{inFlightCount}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/50 transition-colors cursor-default">
              <span className="flex items-center gap-3 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)] animate-pulse"></span> Deviated Route
              </span>
              <span className="font-mono text-amber-400">{deviatedCount}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/50 transition-colors cursor-default">
              <span className="flex items-center gap-3 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.6)]"></span> Delayed
              </span>
              <span className="font-mono text-rose-400">{delayedCount}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/50 transition-colors cursor-default">
              <span className="flex items-center gap-3 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500 shadow-[0_0_8px_rgba(100,116,139,0.6)]"></span> Landed
              </span>
              <span className="font-mono text-slate-400">{landedCount}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Flights Stream (2 cols) */}
        <div className="lg:col-span-2 p-6 rounded-2xl glass-panel space-y-5 shadow-[0_8px_30px_rgba(0,0,0,0.3)] flex flex-col">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold font-heading text-white tracking-wide">Recent Flight Telemetry</h3>
              <p className="text-xs text-slate-400 font-medium mt-1">Latest active route logs in airway.db</p>
            </div>
            <Link
              to="/flights"
              className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-bold tracking-wide transition-colors bg-cyan-500/10 hover:bg-cyan-500/20 px-3 py-1.5 rounded-lg border border-cyan-500/20"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex-1 bg-slate-900/40 rounded-xl border border-slate-700/50 overflow-hidden">
            {loading ? (
              <div className="h-full min-h-[250px] flex items-center justify-center text-cyan-400/70 text-[11px] font-mono tracking-widest animate-pulse">
                INITIALIZING DATABASE STREAM...
              </div>
            ) : flights.length === 0 ? (
              <div className="h-full min-h-[250px] flex flex-col items-center justify-center space-y-4">
                <Plane className="w-10 h-10 text-slate-600 drop-shadow-md" />
                <p className="text-slate-400 text-xs font-medium">No flights found in database.</p>
                <Link
                  to="/add-flight"
                  className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs font-bold shadow-lg hover:shadow-cyan-500/30 transition-all"
                >
                  Create First Flight
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto h-full">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800/80 text-slate-400 font-mono text-[10px] tracking-widest border-b border-slate-700/80">
                    <tr>
                      <th className="py-3 px-4 uppercase">Flight #</th>
                      <th className="py-3 px-4 uppercase">Aircraft</th>
                      <th className="py-3 px-4 uppercase">Route</th>
                      <th className="py-3 px-4 uppercase">Altitude / Speed</th>
                      <th className="py-3 px-4 uppercase text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 font-mono">
                    {flights.slice(0, 5).map((flight) => (
                      <tr key={flight.id} className="hover:bg-slate-800/50 transition-colors group">
                        <td className="py-3.5 px-4 font-bold text-white group-hover:text-cyan-400 transition-colors">
                          {flight.flight_number}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 font-sans font-medium">
                          {flight.aircraft_name}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 font-bold">
                          <span className="text-cyan-400">{flight.origin}</span> <span className="text-slate-500 mx-1">→</span>{' '}
                          <span className="text-indigo-400">{flight.destination}</span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 font-medium">
                          <span className="text-slate-200">{flight.altitude.toLocaleString()}</span> ft <span className="text-slate-600 mx-1">/</span> <span className="text-slate-200">{flight.speed}</span> kts
                        </td>
                        <td className="py-3.5 px-4 text-right">
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
    </div>
  );
}

// Status badge helper component
export function StatusBadge({ status }) {
  let styles = 'bg-slate-800 text-slate-300 border-slate-700 shadow-[0_0_8px_rgba(100,116,139,0.3)]';
  let dotColor = 'bg-slate-400';

  if (status === 'In Flight') {
    styles = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]';
    dotColor = 'bg-emerald-400';
  } else if (status === 'Deviated') {
    styles = 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_10px_rgba(251,191,36,0.2)]';
    dotColor = 'bg-amber-400 animate-pulse';
  } else if (status === 'Delayed') {
    styles = 'bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.2)]';
    dotColor = 'bg-rose-400';
  } else if (status === 'Landed') {
    styles = 'bg-blue-500/10 text-blue-400 border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]';
    dotColor = 'bg-blue-400';
  }

  return (
    <span className={`px-3 py-1.5 rounded-full text-[10px] font-mono font-bold tracking-widest uppercase border ${styles} inline-flex items-center gap-2`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
      {status}
    </span>
  );
}

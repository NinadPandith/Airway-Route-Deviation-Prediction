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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-bg-secondary">
        <div>
          <h2 className="text-3xl font-extrabold font-heading text-transparent bg-clip-text bg-gradient-to-r from-dark to-primary flex items-center gap-3">
            Airway Control Dashboard
          </h2>
          <p className="text-dark/80 text-sm mt-1.5 font-light tracking-wide">
            Real-time flight telemetry monitoring, speed & altitude analytics, and route status updates.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="group flex items-center gap-2 px-4 py-2.5 rounded-xl bg-bg-primary hover:bg-bg-secondary border border-bg-secondary text-dark text-sm font-medium transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-primary group-hover:rotate-180 transition-transform duration-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>

          <Link
            to="/add-flight"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:brightness-90 text-dark text-sm font-bold shadow-lg transition-all transform hover:-translate-y-0.5"
          >
            <PlusCircle className="w-4.5 h-4.5" />
            <span>Add New Flight</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Total Flights */}
        <div className="p-6 rounded-2xl glass-card relative overflow-hidden group hover:border-primary">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-mono font-bold text-dark/60 uppercase tracking-widest">Total Active Routes</span>
            <div className="p-3 rounded-2xl bg-secondary/30 text-dark border border-secondary group-hover:scale-110 transition-transform duration-300 shadow-inner">
              <Plane className="w-5 h-5 transform -rotate-45" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div className="text-4xl font-extrabold font-heading text-dark tracking-tight">{totalFlights}</div>
            <span className="text-xs text-primary font-mono font-bold flex items-center gap-1.5 bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
              <TrendingUp className="w-3.5 h-3.5" /> Live
            </span>
          </div>
          <p className="text-[11px] text-dark/60 font-medium mt-3">Monitored in database</p>
        </div>

        {/* Card 2: In Flight */}
        <div className="p-6 rounded-2xl glass-card relative overflow-hidden group hover:border-primary">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-mono font-bold text-dark/60 uppercase tracking-widest">In-Flight Telemetry</span>
            <div className="p-3 rounded-2xl bg-secondary/30 text-dark border border-secondary group-hover:scale-110 transition-transform duration-300 shadow-inner">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div className="text-4xl font-extrabold font-heading text-dark tracking-tight drop-shadow-sm">{inFlightCount}</div>
            <span className="text-xs text-primary font-mono font-bold">
              {totalFlights ? Math.round((inFlightCount / totalFlights) * 100) : 0}% Active
            </span>
          </div>
          <p className="text-[11px] text-dark/60 font-medium mt-3">Cruising airborne flights</p>
        </div>

        {/* Card 3: Deviated / Delayed */}
        <div className="p-6 rounded-2xl glass-card relative overflow-hidden group hover:border-bg-secondary">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-mono font-bold text-dark/60 uppercase tracking-widest">Deviations & Delays</span>
            <div className="p-3 rounded-2xl bg-bg-secondary border border-dark/20 text-dark group-hover:scale-110 transition-transform duration-300 shadow-inner">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div className="text-4xl font-extrabold font-heading text-dark tracking-tight drop-shadow-sm">
              {deviatedCount + delayedCount}
            </div>
            <span className="text-[10px] font-mono font-bold text-dark/80 bg-bg-secondary px-2.5 py-1 rounded-full border border-dark/20">
              {deviatedCount} DEV / {delayedCount} DLY
            </span>
          </div>
          <p className="text-[11px] text-dark/60 font-medium mt-3">Requires airway inspection</p>
        </div>

        {/* Card 4: Avg Telemetry Speed / Altitude */}
        <div className="p-6 rounded-2xl glass-card relative overflow-hidden group hover:border-primary">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-mono font-bold text-dark/60 uppercase tracking-widest">Avg Speed & Alt</span>
            <div className="p-3 rounded-2xl bg-secondary/30 text-dark border border-secondary group-hover:scale-110 transition-transform duration-300 shadow-inner">
              <Gauge className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div className="text-3xl font-extrabold font-heading text-dark tracking-tight">{avgSpeed} <span className="text-sm font-medium text-dark/60">kts</span></div>
            <div className="text-sm font-mono font-bold text-dark">{avgAltitude.toLocaleString()} <span className="text-[10px] text-dark/70">ft</span></div>
          </div>
          <p className="text-[11px] text-dark/60 font-medium mt-4">Fleet average metrics</p>
        </div>
      </div>

      {/* Live Integration Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl glass-panel space-y-5 relative overflow-hidden">
          <div className="flex items-center justify-between relative z-10">
            <div>
              <h3 className="text-base font-bold font-heading text-dark tracking-wide">Live Integration Snapshot</h3>
              <p className="text-xs text-dark/70 font-medium mt-1">OpenSky + OpenWeather live telemetry overview</p>
            </div>
            <div className="px-3 py-1.5 rounded-full bg-secondary/20 text-dark text-[11px] font-mono font-bold border border-secondary/50">
              {liveStats.weather_severity}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm relative z-10">
            <div className="p-4 rounded-xl bg-bg-primary border border-bg-secondary shadow-sm group transition-colors">
              <div className="text-[10px] uppercase text-dark/60 font-mono font-bold tracking-widest">Live Aircraft</div>
              <div className="text-2xl font-extrabold text-dark mt-1.5 font-heading group-hover:text-primary transition-colors">{liveStats.total_live_aircraft}</div>
            </div>
            <div className="p-4 rounded-xl bg-bg-primary border border-bg-secondary shadow-sm group transition-colors">
              <div className="text-[10px] uppercase text-dark/60 font-mono font-bold tracking-widest">Avg Speed</div>
              <div className="text-2xl font-extrabold text-primary mt-1.5 font-heading group-hover:scale-105 transition-transform origin-left">{liveStats.average_speed.toFixed(1)} kts</div>
            </div>
            <div className="p-4 rounded-xl bg-bg-primary border border-bg-secondary shadow-sm group transition-colors">
              <div className="text-[10px] uppercase text-dark/60 font-mono font-bold tracking-widest">Avg Altitude</div>
              <div className="text-2xl font-extrabold text-dark mt-1.5 font-heading group-hover:text-primary transition-colors">{liveStats.average_altitude.toFixed(0)} ft</div>
            </div>
            <div className="p-4 rounded-xl bg-bg-primary border border-bg-secondary shadow-sm group transition-colors">
              <div className="text-[10px] uppercase text-dark/60 font-mono font-bold tracking-widest">Avg Wind</div>
              <div className="text-2xl font-extrabold text-dark mt-1.5 font-heading group-hover:scale-105 transition-transform origin-left">{liveStats.average_wind_speed.toFixed(1)} m/s</div>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl glass-panel space-y-4 relative overflow-hidden">
          <div className="flex items-center gap-2.5 text-primary relative z-10 mb-2">
            <Clock className="w-5 h-5" />
            <h3 className="text-base font-bold font-heading text-dark tracking-wide">Status & Timing</h3>
          </div>
          
          <div className="p-4 rounded-xl bg-bg-primary border border-bg-secondary shadow-sm relative z-10">
            <div className="text-[10px] uppercase text-dark/60 font-mono font-bold tracking-widest mb-1.5">Last Updated</div>
            <div className="font-bold text-dark tracking-wide text-sm">
              {liveStats.last_updated ? new Date(liveStats.last_updated).toLocaleString() : 'Awaiting first refresh...'}
            </div>
          </div>
          
          <div className="p-4 rounded-xl bg-bg-primary border border-bg-secondary shadow-sm relative z-10">
            <div className="text-[10px] uppercase text-dark/60 font-mono font-bold tracking-widest mb-1.5">System Status</div>
            <div className="font-bold text-primary tracking-wide text-sm flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
               {liveStats.status_message || 'Live telemetry available.'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Radar + Recent Flights Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Stylized Radar & Status Distribution (1 col) */}
        <div className="p-6 rounded-2xl glass-panel space-y-6 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold font-heading text-dark flex items-center gap-2.5 tracking-wide">
              <Compass className="w-4.5 h-4.5 text-primary" /> Airway Radar Monitor
            </h3>
            <span className="text-[9px] font-mono font-bold px-2.5 py-1 rounded bg-secondary/20 text-dark border border-secondary/50 tracking-widest animate-pulse">
              SCANNING
            </span>
          </div>

          {/* Animated Radar Circle */}
          <div className="relative w-52 h-52 mx-auto rounded-full border-2 border-primary/20 bg-bg-primary flex items-center justify-center overflow-hidden shadow-inner">
            {/* Grid circles */}
            <div className="absolute inset-5 rounded-full border border-primary/10"></div>
            <div className="absolute inset-12 rounded-full border border-primary/10"></div>
            <div className="absolute inset-[80px] rounded-full border border-primary/10"></div>
            <div className="absolute w-full h-px bg-primary/10"></div>
            <div className="absolute h-full w-px bg-primary/10"></div>

            {/* Radar Sweeping Hand */}
            <div className="absolute inset-0 animate-radar-sweep origin-center">
              <div className="w-1/2 h-1/2 bg-[conic-gradient(from_180deg_at_100%_100%,rgba(118,183,166,0)_0deg,rgba(118,183,166,0.4)_90deg)] origin-bottom-right rounded-tl-full shadow-[0_0_15px_rgba(118,183,166,0.3)]"></div>
            </div>

            {/* Simulated aircraft blips */}
            <div className="absolute top-12 left-14 w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(118,183,166,0.8)] animate-[ping_2s_ease-out_infinite]"></div>
            <div className="absolute top-12 left-14 w-2 h-2 rounded-full bg-primary"></div>
            
            <div className="absolute bottom-14 right-16 w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_rgba(169,215,200,0.8)] animate-[pulse_1s_ease-out_infinite]"></div>
            
            <div className="absolute top-24 right-12 w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(118,183,166,0.8)]"></div>

            {/* Center radar hub */}
            <div className="relative z-10 text-center">
              <div className="text-2xl font-extrabold font-mono text-primary drop-shadow-md">{inFlightCount}</div>
              <div className="text-[9px] font-mono font-bold text-primary/70 uppercase tracking-widest mt-1">ACTIVE RADAR</div>
            </div>
          </div>

          {/* Status Breakdown Pills */}
          <div className="space-y-3 pt-4 border-t border-dark/10 text-[11px] font-bold tracking-wide">
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-bg-secondary transition-colors cursor-default">
              <span className="flex items-center gap-3 text-dark/80">
                <span className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_rgba(118,183,166,0.6)]"></span> In Flight
              </span>
              <span className="font-mono text-dark">{inFlightCount}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-bg-secondary transition-colors cursor-default">
              <span className="flex items-center gap-3 text-dark/80">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EBCFB1] shadow-[0_0_8px_rgba(235,207,177,0.6)] animate-pulse"></span> Deviated Route
              </span>
              <span className="font-mono text-dark">{deviatedCount}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-bg-secondary transition-colors cursor-default">
              <span className="flex items-center gap-3 text-dark/80">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]"></span> Delayed
              </span>
              <span className="font-mono text-dark">{delayedCount}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-bg-secondary transition-colors cursor-default">
              <span className="flex items-center gap-3 text-dark/80">
                <span className="w-2.5 h-2.5 rounded-full bg-dark/30 shadow-[0_0_8px_rgba(63,106,94,0.3)]"></span> Landed
              </span>
              <span className="font-mono text-dark">{landedCount}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Flights Stream (2 cols) */}
        <div className="lg:col-span-2 p-6 rounded-2xl glass-panel space-y-5 flex flex-col">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold font-heading text-dark tracking-wide">Recent Flight Telemetry</h3>
              <p className="text-xs text-dark/70 font-medium mt-1">Latest active route logs in airway.db</p>
            </div>
            <Link
              to="/flights"
              className="flex items-center gap-1.5 text-xs text-primary hover:text-dark font-bold tracking-wide transition-colors bg-secondary/20 hover:bg-secondary/40 px-3 py-1.5 rounded-lg border border-secondary/30"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex-1 bg-bg-primary rounded-xl border border-bg-secondary overflow-hidden">
            {loading ? (
              <div className="h-full min-h-[250px] flex items-center justify-center text-primary text-[11px] font-mono tracking-widest animate-pulse">
                INITIALIZING DATABASE STREAM...
              </div>
            ) : flights.length === 0 ? (
              <div className="h-full min-h-[250px] flex flex-col items-center justify-center space-y-4">
                <Plane className="w-10 h-10 text-dark/40 drop-shadow-md" />
                <p className="text-dark/60 text-xs font-medium">No flights found in database.</p>
                <Link
                  to="/add-flight"
                  className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-primary hover:brightness-90 text-dark text-xs font-bold shadow-lg transition-all"
                >
                  Create First Flight
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto h-full custom-scrollbar">
                <table className="w-full text-left text-xs text-dark">
                  <thead className="bg-bg-secondary/50 text-dark/80 font-mono text-[10px] tracking-widest border-b border-bg-secondary">
                    <tr>
                      <th className="py-3 px-4 uppercase">Flight #</th>
                      <th className="py-3 px-4 uppercase">Aircraft</th>
                      <th className="py-3 px-4 uppercase">Route</th>
                      <th className="py-3 px-4 uppercase">Altitude / Speed</th>
                      <th className="py-3 px-4 uppercase text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-bg-secondary font-mono">
                    {flights.slice(0, 5).map((flight) => (
                      <tr key={flight.id} className="hover:bg-bg-secondary/30 transition-colors group">
                        <td className="py-3.5 px-4 font-bold text-dark group-hover:text-primary transition-colors">
                          {flight.flight_number}
                        </td>
                        <td className="py-3.5 px-4 text-dark/80 font-sans font-medium">
                          {flight.aircraft_name}
                        </td>
                        <td className="py-3.5 px-4 text-dark font-bold">
                          <span className="text-primary">{flight.origin}</span> <span className="text-dark/50 mx-1">→</span>{' '}
                          <span className="text-secondary">{flight.destination}</span>
                        </td>
                        <td className="py-3.5 px-4 text-dark/70 font-medium">
                          <span className="text-dark">{flight.altitude.toLocaleString()}</span> ft <span className="text-dark/30 mx-1">/</span> <span className="text-dark">{flight.speed}</span> kts
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
  let styles = 'bg-bg-secondary text-dark border-dark/20';
  let dotColor = 'bg-dark/40';

  if (status === 'In Flight') {
    styles = 'bg-primary/20 text-dark border-primary/40';
    dotColor = 'bg-primary';
  } else if (status === 'Deviated') {
    styles = 'bg-[#EBCFB1] text-dark border-dark/20';
    dotColor = 'bg-dark animate-pulse';
  } else if (status === 'Delayed') {
    styles = 'bg-red-100 text-red-800 border-red-200';
    dotColor = 'bg-red-500';
  } else if (status === 'Landed') {
    styles = 'bg-secondary/20 text-dark border-secondary/40';
    dotColor = 'bg-secondary';
  }

  return (
    <span className={`px-3 py-1.5 rounded-full text-[10px] font-mono font-bold tracking-widest uppercase border ${styles} inline-flex items-center gap-2`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
      {status}
    </span>
  );
}

import React, { useState, useEffect } from 'react';
import { Plane, Radio, Search, Bell, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Navbar({ onSearchSubmit }) {
  const [currentTime, setCurrentTime] = useState(new Date().toUTCString());
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toUTCString().slice(17, 25) + ' UTC');
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (onSearchSubmit) {
      onSearchSubmit(searchTerm);
    }
    navigate(`/flights?search=${encodeURIComponent(searchTerm)}`);
  };

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/50 px-6 py-4 flex items-center justify-between shadow-lg">
      {/* Brand & Live Indicator */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-4">
          <div className="relative p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 animate-pulse-glow shadow-xl shadow-cyan-500/30">
            <Plane className="w-6 h-6 text-white transform -rotate-45 drop-shadow-md" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-400"></span>
            </span>
          </div>
          <div>
            <h1 className="text-xl font-extrabold font-heading bg-gradient-to-r from-white via-slate-100 to-cyan-400 bg-clip-text text-transparent drop-shadow-sm tracking-wide">
              AIRWAY RADAR
            </h1>
            <p className="text-[10px] text-cyan-400/80 font-mono tracking-widest uppercase mt-0.5">Route Deviation System</p>
          </div>
        </div>

        {/* Live Telemetry Pill */}
        <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono shadow-[0_0_15px_rgba(16,185,129,0.15)]">
          <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
          <span className="font-semibold tracking-wide">LIVE TELEMETRY</span>
        </div>
      </div>

      {/* Global Search Bar */}
      <form onSubmit={handleSearch} className="hidden lg:flex items-center relative w-[450px] group">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-4 top-3 text-slate-400 group-focus-within:text-cyan-400 transition-colors" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search flight number, aircraft, origin, destination..."
            className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-900/60 backdrop-blur-sm border border-slate-700/50 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/70 focus:ring-2 focus:ring-cyan-500/20 focus:bg-slate-900/80 transition-all shadow-inner"
          />
          {searchTerm && (
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 text-xs bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-3 py-1 rounded-lg transition-all shadow-lg font-medium"
            >
              Go
            </button>
          )}
        </div>
      </form>

      {/* Right Controls: Clock & System Health */}
      <div className="flex items-center gap-6">
        <div className="hidden sm:flex flex-col items-end font-mono text-xs">
          <span className="text-slate-500 text-[9px] uppercase tracking-widest mb-0.5">System Clock</span>
          <span className="text-cyan-300 font-bold bg-slate-900/50 px-2 py-0.5 rounded border border-slate-700/50 shadow-inner">{currentTime}</span>
        </div>

        <div className="flex items-center gap-3 pl-6 border-l border-slate-700/50">
          <div className="p-2.5 rounded-xl bg-slate-900/50 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 border border-slate-700/50 transition-all cursor-pointer shadow-sm relative group">
            <Bell className="w-4.5 h-4.5 group-hover:animate-[wiggle_1s_ease-in-out_infinite]" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]"></span>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-slate-900/80 to-slate-800/80 border border-slate-700/50 shadow-sm text-xs font-semibold text-slate-200">
            <ShieldCheck className="w-4.5 h-4.5 text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]" />
            <span className="hidden sm:inline tracking-wide">FASTAPI ONLINE</span>
          </div>
        </div>
      </div>
    </header>
  );
}

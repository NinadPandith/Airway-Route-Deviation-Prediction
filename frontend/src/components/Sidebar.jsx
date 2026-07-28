import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, PlaneTakeoff, PlusCircle, Compass, Activity, Database } from 'lucide-react';

export default function Sidebar() {
  const navItems = [
    {
      label: 'Dashboard',
      path: '/',
      icon: LayoutDashboard,
      badge: 'Overview',
    },
    {
      label: 'View Flights',
      path: '/flights',
      icon: Compass,
      badge: 'Live',
    },
    {
      label: 'Add Flight',
      path: '/add-flight',
      icon: PlusCircle,
      badge: 'New',
    },
    {
      label: 'Live Monitoring',
      path: '/live-monitoring',
      icon: Activity,
      badge: 'Live',
    },
  ];

  return (
    <aside className="w-64 shrink-0 glass-panel border-r border-slate-800/80 bg-slate-950/60 p-4 flex flex-col justify-between hidden md:flex min-h-[calc(100vh-61px)]">
      <div className="space-y-6">
        {/* Nav Group Title */}
        <div>
          <p className="px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider font-mono">
            Navigation Menu
          </p>
          <nav className="mt-3 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-300 border border-cyan-500/30 shadow-lg shadow-cyan-500/5'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60 hover:border-slate-800/80 border border-transparent'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold bg-slate-900 text-slate-400 border border-slate-800">
                    {item.badge}
                  </span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Phase Badge Info Card */}
        <div className="p-4 rounded-xl glass-card border border-cyan-500/20 bg-gradient-to-br from-cyan-950/30 to-slate-900/40 relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <PlaneTakeoff className="w-24 h-24 text-cyan-400" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs mb-1">
              <Activity className="w-3.5 h-3.5" />
              <span>PHASE 2: LIVE INTEGRATION</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Live aircraft and weather telemetry integration for the airway monitoring platform.
            </p>
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-800">
              <span className="flex items-center gap-1">
                <Database className="w-3 h-3 text-cyan-400" /> SQLite DB
              </span>
              <span className="text-emerald-400 font-semibold">airway.db</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer Credits */}
      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between font-mono">
        <span>Airway Dev V1.0</span>
        <span className="text-cyan-400">FastAPI + React</span>
      </div>
    </aside>
  );
}

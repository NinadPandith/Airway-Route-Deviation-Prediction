import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, PlaneTakeoff, PlusCircle, Compass, Activity, Database, ChevronRight } from 'lucide-react';

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
    <aside className="w-64 shrink-0 glass-panel border-r border-slate-800/50 p-5 flex flex-col justify-between hidden md:flex min-h-[calc(100vh-73px)] shadow-[4px_0_24px_rgba(0,0,0,0.2)] z-30">
      <div className="space-y-8">
        {/* Nav Group Title */}
        <div>
          <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-4">
            Navigation Menu
          </p>
          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `group flex items-center justify-between px-4 py-3 rounded-xl font-medium text-sm transition-all duration-300 relative overflow-hidden ${
                      isActive
                        ? 'text-cyan-300 bg-gradient-to-r from-cyan-500/20 to-blue-500/5 border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.1)]'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent hover:border-slate-700/50'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 to-blue-500 rounded-l-xl"></div>
                      )}
                      <div className="flex items-center gap-3 relative z-10">
                        <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'text-cyan-400 scale-110' : 'text-slate-500 group-hover:text-cyan-400 group-hover:scale-110'}`} />
                        <span className="tracking-wide">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-bold tracking-widest uppercase transition-colors ${
                          isActive 
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' 
                            : 'bg-slate-900/80 text-slate-500 border border-slate-700/50 group-hover:bg-slate-800 group-hover:text-slate-300'
                        }`}>
                          {item.badge}
                        </span>
                        <ChevronRight className={`w-3.5 h-3.5 transition-all duration-300 ${isActive ? 'text-cyan-400 opacity-100 translate-x-0' : 'text-slate-600 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-cyan-500'}`} />
                      </div>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Phase Badge Info Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-800/40 border border-cyan-500/20 shadow-lg relative overflow-hidden group">
          <div className="absolute -right-6 -bottom-6 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
            <PlaneTakeoff className="w-32 h-32 text-cyan-400 transform -rotate-12" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-[11px] tracking-widest mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></div>
              <span>PHASE 2: LIVE</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Live aircraft and weather telemetry integration active.
            </p>
            <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-500 pt-3 border-t border-slate-700/50">
              <span className="flex items-center gap-1.5">
                <Database className="w-3 h-3 text-cyan-500" /> DB SYNC
              </span>
              <span className="text-emerald-400 drop-shadow-[0_0_2px_rgba(16,185,129,0.5)]">airway.db</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer Credits */}
      <div className="px-4 py-3 rounded-xl bg-slate-900/40 border border-slate-800/50 text-[10px] text-slate-500 flex items-center justify-between font-mono font-bold tracking-widest uppercase shadow-inner">
        <span>Airway Dev</span>
        <span className="text-cyan-400/80">V1.0</span>
      </div>
    </aside>
  );
}

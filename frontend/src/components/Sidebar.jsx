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
    <aside className="w-64 shrink-0 bg-gradient-to-b from-primary to-dark border-r border-dark/20 p-5 flex flex-col justify-between hidden md:flex min-h-[calc(100vh-73px)] shadow-[4px_0_24px_rgba(0,0,0,0.2)] z-30">
      <div className="space-y-8">
        {/* Nav Group Title */}
        <div>
          <p className="px-3 text-[10px] font-bold text-white/60 uppercase tracking-widest font-mono mb-4">
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
                        ? 'text-dark bg-secondary shadow-lg shadow-secondary/20 border border-transparent'
                        : 'text-white/70 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/20'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-3 relative z-10">
                        <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'text-dark scale-110' : 'text-white/60 group-hover:text-white group-hover:scale-110'}`} />
                        <span className="tracking-wide">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-bold tracking-widest uppercase transition-colors ${
                          isActive 
                            ? 'bg-white/30 text-dark border border-dark/20' 
                            : 'bg-black/20 text-white/60 border border-white/10 group-hover:bg-black/30 group-hover:text-white'
                        }`}>
                          {item.badge}
                        </span>
                        <ChevronRight className={`w-3.5 h-3.5 transition-all duration-300 ${isActive ? 'text-dark opacity-100 translate-x-0' : 'text-white/40 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-white'}`} />
                      </div>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Phase Badge Info Card */}
        <div className="p-5 rounded-2xl bg-black/20 border border-white/10 shadow-lg relative overflow-hidden group">
          <div className="absolute -right-6 -bottom-6 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
            <PlaneTakeoff className="w-32 h-32 text-secondary transform -rotate-12" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-secondary font-bold text-[11px] tracking-widest mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></div>
              <span>PHASE 2: LIVE</span>
            </div>
            <p className="text-xs text-white/70 leading-relaxed mb-4">
              Live aircraft and weather telemetry integration active.
            </p>
            <div className="flex items-center justify-between text-[10px] font-mono font-bold text-white/60 pt-3 border-t border-white/10">
              <span className="flex items-center gap-1.5">
                <Database className="w-3 h-3 text-secondary" /> DB SYNC
              </span>
              <span className="text-secondary">airway.db</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer Credits */}
      <div className="px-4 py-3 rounded-xl bg-black/20 border border-white/10 text-[10px] text-white/60 flex items-center justify-between font-mono font-bold tracking-widest uppercase shadow-inner">
        <span>Airway Dev</span>
        <span className="text-secondary">V1.0</span>
      </div>
    </aside>
  );
}

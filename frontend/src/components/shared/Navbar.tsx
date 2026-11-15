import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Radio, ShieldAlert, PhoneCall, LayoutDashboard, History, Sparkles } from 'lucide-react';

export const Navbar: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { label: 'Home', path: '/', icon: Sparkles },
    { label: 'Live Caller', path: '/caller', icon: PhoneCall },
    { label: 'Command Center', path: '/operator', icon: LayoutDashboard },
    { label: 'Incident History', path: '/history', icon: History },
  ];

  return (
    <header className="bg-midnight-900/90 backdrop-blur border-b border-surface-border sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-coral-glow flex items-center justify-center text-midnight-950 font-bold shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
            <Radio className="w-5 h-5 text-midnight-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-white font-mono">
                RESPONSE<span className="text-amber-400">OS</span>
              </span>
              <span className="text-[10px] font-mono uppercase bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/20">
                Simulation
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Every second matters.</p>
          </div>
        </Link>

        {/* Navigation links */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  active
                    ? 'bg-surface-card text-amber-400 border border-amber-500/30 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-surface-hover'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-amber-400' : 'text-slate-400'}`} />
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

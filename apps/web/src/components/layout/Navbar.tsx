import { Link, useLocation } from 'react-router-dom';
import { Network, Activity, Wrench, BarChart2, Store, Users, RotateCcw, Monitor } from 'lucide-react';
import clsx from 'clsx';
import { useState } from 'react';

const NavLink = ({ to, icon: Icon, children }: any) => {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
  
  return (
    <Link
      to={to}
      className={clsx(
        "flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm font-medium",
        isActive 
          ? "bg-primary/10 text-primary" 
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      )}
    >
      <Icon className="w-4 h-4" />
      {children}
    </Link>
  );
};

export default function Navbar() {
  const [demoMode, setDemoMode] = useState(true);

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <Network className="w-6 h-6 text-primary" />
            Omni<span className="text-primary font-normal">Web</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-1">
            <NavLink to="/build" icon={Activity}>Build</NavLink>
            <NavLink to="/healing" icon={Wrench}>Healing</NavLink>
            <NavLink to="/observatory" icon={BarChart2}>Observatory</NavLink>
            <NavLink to="/marketplace" icon={Store}>Marketplace</NavLink>
            <NavLink to="/tenant" icon={Users}>Tenant</NavLink>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border text-xs font-medium">
            <Monitor className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Demo Mode</span>
            <button 
              onClick={() => setDemoMode(!demoMode)}
              className={clsx("w-8 h-4 rounded-full relative transition-colors", demoMode ? "bg-primary" : "bg-muted")}
            >
              <div className={clsx("w-3 h-3 rounded-full bg-background absolute top-0.5 transition-all", demoMode ? "left-4.5" : "left-0.5")} />
            </button>
          </div>
          <button 
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => window.location.reload()}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Data
          </button>
        </div>
      </div>
    </nav>
  );
}

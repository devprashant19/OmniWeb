import { useEffect, useState } from 'react';
import { fetchAPI } from '../lib/api';
import { CheckCircle2, Download, Search, Settings, ShieldCheck, TerminalSquare } from 'lucide-react';

export default function Marketplace() {
  const [adapters, setAdapters] = useState<any[]>([]);
  const [installed, setInstalled] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchAPI('/adapters').then(setAdapters).catch(console.error);
  }, []);

  const handleInstall = (id: string) => {
    setInstalled(prev => ({ ...prev, [id]: true }));
    // In a real app, we would make an API call to link adapter to tenant
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Adapter Registry</h1>
            <p className="text-muted-foreground">Discover, install, and publish Webcmd adapters for any site.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search adapters..." 
                className="pl-9 pr-4 py-2 bg-secondary border border-border rounded-md text-sm w-64 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md text-sm font-medium transition-colors">
              Publish Adapter
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adapters.map((adapter) => (
            <div key={adapter.id} className="bg-card border border-border rounded-xl shadow-sm hover:border-primary/50 transition-all flex flex-col">
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                    <TerminalSquare className="w-5 h-5 text-foreground" />
                  </div>
                  {adapter.visibility === 'built_in' && (
                    <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-green-500 bg-green-500/10 px-2 py-1 rounded-full">
                      <ShieldCheck className="w-3 h-3" /> Verified
                    </div>
                  )}
                </div>
                
                <h3 className="text-lg font-semibold truncate" title={adapter.siteName}>
                  {adapter.siteName}
                </h3>
                <div className="text-sm font-mono text-muted-foreground mt-1 mb-4">
                  {adapter.commandName}
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Strategy</span>
                    <span className="font-medium bg-secondary px-2 rounded text-xs py-0.5">{adapter.strategy}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Success Rate</span>
                    <span className="font-medium text-green-400">{(adapter.successRate * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
              
              <div className="p-4 border-t border-border bg-secondary/10 flex justify-between items-center">
                <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                  <Settings className="w-4 h-4" />
                </button>
                {installed[adapter.id] ? (
                  <button disabled className="flex items-center gap-2 bg-secondary text-muted-foreground px-4 py-2 rounded-md text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4" /> Installed
                  </button>
                ) : (
                  <button 
                    onClick={() => handleInstall(adapter.id)}
                    className="flex items-center gap-2 bg-foreground text-background hover:bg-foreground/90 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    <Download className="w-4 h-4" /> Install
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        
      </div>
    </div>
  );
}

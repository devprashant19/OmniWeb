import { useEffect, useState } from 'react';
import { fetchAPI } from '../lib/api';
import { socket } from '../lib/socket';
import { Activity, AlertTriangle, CheckCircle2, Clock, Play, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

export default function HealingPipeline() {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    fetchAPI('/healing').then(setEvents);

    socket.emit('subscribe_healing');

    socket.on('drift_detected', (event: any) => {
      setEvents(prev => [event, ...prev]);
    });

    socket.on('drift_updated', (data: { id: string, status: string }) => {
      setEvents(prev => prev.map(e => e.id === data.id ? { ...e, status: data.status } : e));
    });

    return () => {
      socket.off('drift_detected');
      socket.off('drift_updated');
    };
  }, []);

  const triggerDrift = async () => {
    await fetchAPI('/healing/trigger', { method: 'POST' });
  };

  const columns = [
    { id: 'detected', title: 'Detected', color: 'border-red-500/50 text-red-500 bg-red-500/10' },
    { id: 'healing', title: 'Diagnosing & Repairing', color: 'border-amber-500/50 text-amber-500 bg-amber-500/10' },
    { id: 'verifying', title: 'Verifying (Canary)', color: 'border-blue-500/50 text-blue-500 bg-blue-500/10' },
    { id: 'resolved', title: 'Resolved', color: 'border-green-500/50 text-green-500 bg-green-500/10' },
  ];

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="border-b border-border bg-card p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Self-Healing Pipeline</h1>
            <p className="text-muted-foreground text-sm">
              Not a scraper — this is the healing loop that keeps 40 site adapters alive without a human touching selectors.
            </p>
          </div>
          <button 
            onClick={triggerDrift}
            className="flex items-center gap-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground px-4 py-2 rounded-md font-medium transition-colors"
          >
            <ShieldAlert className="w-5 h-5" />
            Trigger Simulated Drift
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="max-w-7xl mx-auto h-full flex gap-6 min-w-[1000px]">
          {columns.map(col => (
            <div key={col.id} className="flex-1 flex flex-col bg-card/50 rounded-xl border border-border overflow-hidden">
              <div className={clsx("px-4 py-3 border-b text-sm font-semibold flex items-center justify-between", col.color)}>
                {col.title}
                <span className="px-2 py-0.5 rounded-full bg-background/50 text-xs">
                  {events.filter(e => e.status === col.id).length}
                </span>
              </div>
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                <AnimatePresence>
                  {events.filter(e => e.status === col.id).map(event => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      key={event.id}
                      className="bg-background border border-border rounded-lg p-4 shadow-sm cursor-pointer hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          {event.adapter?.siteName || 'Unknown'}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(event.detectedAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <h4 className="text-sm font-medium mb-3">{event.classification.replace('_', ' ')}</h4>
                      
                      {event.status !== 'resolved' ? (
                        <div className="bg-secondary/50 rounded p-2 text-xs font-mono text-muted-foreground line-clamp-2 mb-3">
                          {event.diffSummary}
                        </div>
                      ) : (
                        <div className="bg-green-500/10 border border-green-500/20 text-green-400 rounded p-2 text-xs font-mono line-clamp-2 mb-3">
                          + new robust selector identified
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        {event.status === 'healing' && <Activity className="w-3.5 h-3.5 text-amber-500 animate-pulse" />}
                        {event.status === 'verifying' && <Play className="w-3.5 h-3.5 text-blue-500 animate-bounce" />}
                        {event.status === 'resolved' && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                        <span className="capitalize">{event.status}</span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

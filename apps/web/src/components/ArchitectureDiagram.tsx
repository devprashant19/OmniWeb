import { motion } from 'framer-motion';

export default function ArchitectureDiagram() {
  return (
    <div className="w-full h-full relative flex items-center justify-center p-8 bg-card">
      <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }}>
        {/* Connection Lines */}
        <path d="M 250 250 L 400 250" stroke="hsl(var(--muted-foreground))" strokeWidth="2" strokeDasharray="4 4" />
        <path d="M 600 250 L 750 250" stroke="hsl(var(--muted-foreground))" strokeWidth="2" strokeDasharray="4 4" />
        
        {/* Animated Packet */}
        <motion.circle 
          r="4" 
          fill="hsl(var(--primary))"
          initial={{ cx: 250, cy: 250, opacity: 0 }}
          animate={{ 
            cx: [250, 400, 400, 600, 600, 750], 
            cy: [250, 250, 250, 250, 250, 250],
            opacity: [0, 1, 1, 1, 1, 0]
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />
      </svg>
      
      {/* Nodes */}
      <div className="z-10 flex gap-24 items-center w-full max-w-4xl justify-center">
        
        <div className="flex flex-col items-center">
          <div className="w-32 h-32 rounded-2xl bg-secondary border-2 border-border flex flex-col items-center justify-center shadow-lg">
            <span className="font-semibold text-lg text-foreground">API Gateway</span>
            <span className="text-xs text-muted-foreground mt-1">Tenant Auth</span>
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <div className="w-40 h-32 rounded-2xl bg-primary/10 border-2 border-primary/50 flex flex-col items-center justify-center shadow-[0_0_30px_hsl(var(--primary)/0.2)]">
            <span className="font-semibold text-lg text-primary">Workflow Engine</span>
            <span className="text-xs text-muted-foreground mt-1 text-center px-2">DAG Orchestration<br/>& Queues</span>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="w-36 h-20 rounded-xl bg-secondary border border-border flex flex-col items-center justify-center">
            <span className="font-medium text-foreground">Worker Fleet</span>
          </div>
          <div className="w-36 h-20 rounded-xl bg-accent/20 border border-accent/50 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-accent/10 animate-pulse" />
            <span className="font-medium text-accent-foreground z-10 text-center">Self-Healing<br/>Pipeline</span>
          </div>
        </div>
        
      </div>
    </div>
  );
}

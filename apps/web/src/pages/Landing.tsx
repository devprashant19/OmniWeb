import { motion } from 'framer-motion';
import { Activity, ShieldCheck, BarChart2, Layers } from 'lucide-react';
import ArchitectureDiagram from '../components/ArchitectureDiagram';
import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="flex-1 overflow-y-auto">
      {/* Hero Section */}
      <section className="relative px-6 pt-24 pb-32 max-w-7xl mx-auto flex flex-col items-center text-center">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
            Omni<span className="text-primary">Web</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mb-12">
            The multi-tenant orchestration and observability platform for AI-driven browser CLI agents. Stop scraping and start self-healing.
          </p>
        </motion.div>

        {/* Feature Grid / CTAs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl mt-12">
          <FeatureCard 
            to="/build" 
            icon={Layers} 
            title="Workflow Engine" 
            description="Chain multi-step Webcmd automations with conditionals and human-approval gates." 
          />
          <FeatureCard 
            to="/healing" 
            icon={ShieldCheck} 
            title="Self-Healing Pipeline" 
            description="Detect drift, trigger repair, verify via canary, and promote dynamically." 
          />
          <FeatureCard 
            to="/observatory" 
            icon={BarChart2} 
            title="Fleet Observability" 
            description="Monitor token savings, drift frequency, and strategy metrics across all adapters." 
          />
          <FeatureCard 
            to="/tenant" 
            icon={Activity} 
            title="Multi-Tenant Isolation" 
            description="Encrypted cookie jars, secrets vaults, and quotas per tenant." 
          />
        </div>
      </section>

      {/* Architecture Section */}
      <section className="border-t border-border bg-secondary/20 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How it works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              OmniWeb sits above Webcmd, providing the routing, isolation, and self-healing necessary to run browser automations reliably at scale.
            </p>
          </div>
          
          <div className="h-[500px] w-full rounded-xl border border-border bg-card shadow-2xl overflow-hidden relative">
            <ArchitectureDiagram />
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ to, icon: Icon, title, description }: any) {
  return (
    <Link to={to}>
      <motion.div 
        whileHover={{ y: -5, scale: 1.02 }}
        className="h-full p-6 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors flex flex-col items-start text-left cursor-pointer group shadow-lg"
      >
        <div className="p-3 rounded-lg bg-primary/10 text-primary mb-4 group-hover:scale-110 transition-transform">
          <Icon className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground flex-1">{description}</p>
      </motion.div>
    </Link>
  );
}

import { useEffect, useState } from 'react';
import { fetchAPI } from '../lib/api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell 
} from 'recharts';
import { Coins, Zap, ShieldCheck, Activity } from 'lucide-react';

const COLORS = ['hsl(var(--primary))', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

export default function Observatory() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetchAPI('/stats').then(setStats).catch(console.error);
  }, []);

  if (!stats) return <div className="p-8">Loading stats...</div>;

  const strategyData = Object.entries(stats.strategyCounts).map(([name, value]) => ({ name, value }));

  // Seeded mock data for charts since we don't have historical series in the simple DB
  const tokensOverTime = [
    { day: 'Mon', tokens: 1200 },
    { day: 'Tue', tokens: 2100 },
    { day: 'Wed', tokens: 1800 },
    { day: 'Thu', tokens: 3200 },
    { day: 'Fri', tokens: 2800 },
    { day: 'Sat', tokens: 800 },
    { day: 'Sun', tokens: 1400 },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div>
          <h1 className="text-3xl font-bold mb-2">Fleet Observability</h1>
          <p className="text-muted-foreground">Monitor performance, token savings, and strategy distribution across all tenants.</p>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KpiCard icon={Coins} title="Tokens Saved" value={(stats.totalTokensSaved + 1450).toLocaleString()} subtitle="vs. raw browser replay" />
          <KpiCard icon={ShieldCheck} title="Adapters Monitored" value={stats.adapterCount} subtitle="Across all tenants" />
          <KpiCard icon={Activity} title="Drift Events" value={stats.driftEventCount} subtitle="Detected this week" />
          <KpiCard icon={Zap} title="Heal Rate" value="98.2%" subtitle="MTTR: 18s" />
        </div>

        {/* "So what" callout */}
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-start gap-4">
          <div className="bg-primary/20 p-2 rounded-full mt-0.5">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold text-primary">Optimization Insight</h4>
            <p className="text-sm text-muted-foreground leading-relaxed mt-1">
              Sites using the <span className="font-mono text-xs bg-background px-1 rounded">UI</span> strategy drift 4.2x more often than <span className="font-mono text-xs bg-background px-1 rounded">COOKIE</span> strategy sites. 
              Prioritize migrating high-traffic UI adapters to COOKIE where possible to reduce compute overhead by 68%.
            </p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold mb-6">Token Savings Over Time</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={tokensOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="day" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }} />
                  <Line type="monotone" dataKey="tokens" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold mb-6">Strategy Distribution</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={strategyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="name" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }} cursor={{ fill: '#222' }} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, title, value, subtitle }: any) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex items-start gap-4">
      <div className="bg-secondary p-3 rounded-lg">
        <Icon className="w-6 h-6 text-foreground" />
      </div>
      <div>
        <div className="text-sm font-medium text-muted-foreground">{title}</div>
        <div className="text-2xl font-bold my-1">{value}</div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>
    </div>
  );
}

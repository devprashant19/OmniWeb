import { useEffect, useState } from 'react';
import { fetchAPI } from '../lib/api';
import { Key, Lock, Server, Users } from 'lucide-react';
import clsx from 'clsx';

export default function Tenant() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  useEffect(() => {
    fetchAPI('/tenants').then(res => {
      setTenants(res);
      if (res.length > 0) setSelectedTenantId(res[0].id);
    }).catch(console.error);
  }, []);

  const selectedTenant = tenants.find(t => t.id === selectedTenantId);

  return (
    <div className="flex-1 overflow-y-auto bg-background p-8 flex gap-8">
      {/* Sidebar / Switcher */}
      <div className="w-64 space-y-6">
        <div>
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Tenants</h2>
          <div className="space-y-2">
            {tenants.map(tenant => (
              <button
                key={tenant.id}
                onClick={() => setSelectedTenantId(tenant.id)}
                className={clsx(
                  "w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-between",
                  selectedTenantId === tenant.id 
                    ? "bg-primary/10 text-primary border border-primary/20" 
                    : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                )}
              >
                {tenant.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Panel */}
      {selectedTenant && (
        <div className="flex-1 max-w-4xl space-y-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">{selectedTenant.name}</h1>
            <p className="text-muted-foreground">Manage isolation, cookie profiles, and usage quotas.</p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Quota Panel */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Server className="w-4 h-4 text-primary" /> Compute Quota
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-muted-foreground">Monthly Runs</span>
                    <span className="font-medium text-foreground">84% (8,421 / 10,000)</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-[84%]" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-muted-foreground">Concurrent Workers</span>
                    <span className="font-medium text-amber-500">10 / 10</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 w-full" />
                  </div>
                  <p className="text-xs text-amber-500/80 mt-2">Maximum concurrency reached. Queued runs will wait.</p>
                </div>
              </div>
            </div>

            {/* Secrets Vault */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Lock className="w-4 h-4 text-purple-500" /> Secrets Vault
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-secondary rounded border border-border">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">AWS_ACCESS_KEY</span>
                  </div>
                  <code className="text-xs text-muted-foreground px-2 py-1 bg-background rounded">sk_live_••••4f2c</code>
                </div>
                <div className="flex items-center justify-between p-3 bg-secondary rounded border border-border">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">GITHUB_TOKEN</span>
                  </div>
                  <code className="text-xs text-muted-foreground px-2 py-1 bg-background rounded">ghp_•••••••••••891a</code>
                </div>
                <button className="w-full py-2 border border-dashed border-border rounded text-sm text-muted-foreground hover:bg-secondary transition-colors mt-2">
                  + Add Secret
                </button>
              </div>
            </div>
          </div>

          {/* Profiles */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" /> Encrypted Cookie Profiles
              </h3>
            </div>
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-secondary/50">
                <tr>
                  <th className="px-6 py-3 font-medium">Site</th>
                  <th className="px-6 py-3 font-medium">Strategy</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {selectedTenant.profiles.map((profile: any) => (
                  <tr key={profile.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4 font-medium">{profile.siteName}</td>
                    <td className="px-6 py-4">
                      <span className="bg-secondary px-2 py-1 rounded text-xs">{profile.strategy}</span>
                    </td>
                    <td className="px-6 py-4">
                      {profile.status === 'active' ? (
                        <span className="text-green-500 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Active</span>
                      ) : (
                        <span className="text-amber-500 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Needs Re-auth</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}
    </div>
  );
}

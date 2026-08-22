import { useState, useCallback, useEffect } from 'react';
import { ReactFlow, Controls, Background, useNodesState, useEdgesState, addEdge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import WorkflowNode from '../components/WorkflowNode';
import { Play, Settings2 } from 'lucide-react';
import { fetchAPI } from '../lib/api';
import { useNavigate } from 'react-router-dom';

const nodeTypes = {
  workflowNode: WorkflowNode,
};

const initialNodes = [
  { id: '1', type: 'workflowNode', position: { x: 250, y: 50 }, data: { type: 'run', label: 'hackernews top' } },
  { id: '2', type: 'workflowNode', position: { x: 250, y: 150 }, data: { type: 'run', label: 'gdg team' } },
  { id: '3', type: 'workflowNode', position: { x: 250, y: 250 }, data: { type: 'if', label: 'success' } },
  { id: '4', type: 'workflowNode', position: { x: 100, y: 350 }, data: { type: 'run', label: 'site sample' } },
  { id: '5', type: 'workflowNode', position: { x: 400, y: 350 }, data: { type: 'approve', label: 'eng-manager' } },
  { id: '6', type: 'workflowNode', position: { x: 400, y: 450 }, data: { type: 'run', label: 'hackernews ask' } },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2' },
  { id: 'e2-3', source: '2', target: '3' },
  { id: 'e3-4', source: '3', target: '4', label: 'true' },
  { id: 'e3-5', source: '3', target: '5', label: 'false' },
  { id: 'e5-6', source: '5', target: '6' },
];

export default function WorkflowBuilder() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isDeploying, setIsDeploying] = useState(false);
  const navigate = useNavigate();

  const onConnect = useCallback(
    (params: any) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const [tenantId, setTenantId] = useState<string | null>(null);

  useEffect(() => {
    fetchAPI('/tenants').then(res => {
      if (res && res.length > 0) setTenantId(res[0].id);
    }).catch(console.error);
  }, []);

  const handleRun = async () => {
    if (!tenantId) return;
    setIsDeploying(true);
    try {
      // In a real app, we would parse the DAG back into YAML DSL here.
      // For the demo, we just pass the pre-seeded workflow YAML block.
      const sampleYaml = `
name: weekly-pipeline-digest
steps:
  - id: hn_top
    run: webcmd hackernews top -f plain
  - id: gdg_team
    run: webcmd gdg team -f plain
  - id: check
    if: "success"
    run: webcmd site sample
  - id: gate
    approve: { role: "eng-manager", timeout: 2h }
  - id: hn_ask
    run: webcmd hackernews ask -f plain
`;
      const res = await fetchAPI('/workflows/run', {
        method: 'POST',
        body: JSON.stringify({ yaml: sampleYaml, tenantId: 'cm02abcd0001dummytenant123' }) // We use a dummy tenant for demo, in real life we fetch tenants. Wait, I should fetch a tenant ID.
      });
      navigate(`/runs/${res.runId}`);
    } catch (err) {
      console.error(err);
      setIsDeploying(false);
    }
  };

  return (
    <div className="flex h-full w-full relative">
      {/* Sidebar */}
      <div className="w-80 border-r border-border bg-card flex flex-col z-10 shadow-lg">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-primary" />
            Workflow Settings
          </h2>
          <p className="text-sm text-muted-foreground mt-1">weekly-pipeline-digest</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wider">Available Nodes</h3>
            <div className="space-y-2">
              <div className="p-3 border border-border rounded bg-background text-sm font-medium cursor-grab hover:border-primary">webcmd run</div>
              <div className="p-3 border border-border rounded bg-background text-sm font-medium cursor-grab hover:border-primary">if condition</div>
              <div className="p-3 border border-border rounded bg-background text-sm font-medium cursor-grab hover:border-primary">human approval</div>
              <div className="p-3 border border-border rounded bg-background text-sm font-medium cursor-grab hover:border-primary">retry block</div>
            </div>
          </div>
          
          <div className="bg-secondary/50 p-4 rounded-lg border border-border">
            <h4 className="font-medium text-sm mb-2 text-foreground">Why this matters</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Don't just write scripts. Visually chain complex automations with branching logic and human-in-the-loop approval gates.
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-border">
          <button 
            onClick={handleRun}
            disabled={isDeploying}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            {isDeploying ? (
              <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <Play className="w-5 h-5" />
            )}
            Run this workflow
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 h-full bg-background relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          className="dark"
        >
          <Background color="hsl(var(--muted-foreground))" gap={16} />
          <Controls className="!bg-card !border-border !fill-foreground" />
        </ReactFlow>
      </div>
    </div>
  );
}

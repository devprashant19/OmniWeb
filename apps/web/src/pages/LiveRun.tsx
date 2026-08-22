import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchAPI } from '../lib/api';
import { socket } from '../lib/socket';
import { CheckCircle2, Circle, Loader2, XCircle, AlertTriangle, Terminal, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

export default function LiveRun() {
  const { id } = useParams();
  const [run, setRun] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [tokensSaved, setTokensSaved] = useState(0);
  const [stepLogs, setStepLogs] = useState<Record<string, string[]>>({});

  useEffect(() => {
    // Bug fix #5: added .catch() with error state
    fetchAPI(`/runs/${id}`)
      .then(res => {
        if (!res) {
          setError(`Run "${id}" not found.`);
          return;
        }
        setRun(res);
        setTokensSaved(res.costTokensSaved || 0);
      })
      .catch((err) => {
        console.error('Failed to load run:', err);
        setError(`Could not load run. ${err.message}`);
      });

    socket.emit('subscribe_run', id);

    // Bug fix #9: use named handlers so socket.off() only removes this component's listeners
    const onStepUpdated = (step: any) => {
      setRun((prev: any) => {
        if (!prev) return prev;
        const steps = [...prev.steps];
        const idx = steps.findIndex(s => s.id === step.id);
        if (idx >= 0) steps[idx] = step;
        else steps.push(step);
        return { ...prev, steps };
      });
    };

    const onStepLog = ({ stepId, log }: any) => {
      setStepLogs(prev => ({
        ...prev,
        [stepId]: [...(prev[stepId] || []), log]
      }));
    };

    const onRunWaitingApproval = () => {
      setRun((prev: any) => prev ? { ...prev, status: 'waiting_approval' } : prev);
    };

    const onRunResumed = () => {
      setRun((prev: any) => prev ? { ...prev, status: 'running' } : prev);
    };

    const onRunCompleted = (data: any) => {
      setRun((prev: any) => prev ? { ...prev, status: data.status } : prev);
    };

    socket.on('step_updated', onStepUpdated);
    socket.on('step_log', onStepLog);
    socket.on('run_waiting_approval', onRunWaitingApproval);
    socket.on('run_resumed', onRunResumed);
    socket.on('run_completed', onRunCompleted);

    return () => {
      socket.off('step_updated', onStepUpdated);
      socket.off('step_log', onStepLog);
      socket.off('run_waiting_approval', onRunWaitingApproval);
      socket.off('run_resumed', onRunResumed);
      socket.off('run_completed', onRunCompleted);
    };
  }, [id]);

  useEffect(() => {
    if (run?.costTokensSaved > tokensSaved) {
      setTokensSaved(run.costTokensSaved);
    }
  }, [run?.costTokensSaved, tokensSaved]);

  const handleApprove = async (stepId: string) => {
    await fetchAPI(`/runs/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ stepId })
    });
  };

  if (error) {
    return (
      <div className="p-8 flex items-center gap-3 text-destructive">
        <AlertCircle className="w-5 h-5" />
        <span>{error}</span>
      </div>
    );
  }

  if (!run) return <div className="p-8 text-muted-foreground">Loading run...</div>;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'succeeded': return <CheckCircle2 className="w-6 h-6 text-green-500" />;
      case 'failed': return <XCircle className="w-6 h-6 text-destructive" />;
      case 'healing': return <AlertTriangle className="w-6 h-6 text-amber-500" />;
      case 'running': return <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />;
      default: return <Circle className="w-6 h-6 text-muted-foreground" />;
    }
  };

  return (
    <div className="flex h-full w-full">
      {/* Visualizer */}
      <div className="flex-1 p-8 bg-background overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h1 className="text-2xl font-bold mb-2">Live Run Visualizer</h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-sm">Run ID: <code className="text-foreground">{id}</code></span>
                <span>•</span>
                <span className="text-sm">Status: <span className="text-foreground capitalize">{run.status?.replace(/_/g, ' ')}</span></span>
              </div>
            </div>
            <div className="bg-primary/10 border border-primary/20 px-6 py-4 rounded-xl text-center">
              <div className="text-3xl font-bold text-primary mb-1">{tokensSaved}</div>
              <div className="text-xs font-medium text-primary uppercase tracking-wider">Tokens Saved</div>
              <div className="text-[10px] text-muted-foreground mt-1 text-center">vs. raw browser replay</div>
            </div>
          </div>

          <div className="space-y-4">
            <AnimatePresence>
              {run.steps.map((step: any) => (
                <motion.div 
                  key={step.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={clsx(
                    "flex items-center p-4 rounded-xl border bg-card shadow-sm transition-all relative overflow-hidden",
                    step.status === 'running' ? "border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)]" : "border-border",
                    step.status === 'pending' && step.command === 'approve' && run.status === 'waiting_approval' && "border-purple-500/50"
                  )}
                >
                  {step.status === 'running' && (
                    <div className="absolute inset-0 bg-blue-500/5 animate-pulse" />
                  )}
                  
                  <div className="w-12 flex justify-center z-10">{getStatusIcon(step.status)}</div>
                  
                  <div className="flex-1 px-4 z-10">
                    <div className="text-sm font-semibold mb-1">{step.command}</div>
                    <div className="text-xs text-muted-foreground">
                      Strategy: <span className="text-foreground uppercase">{step.strategy}</span>
                    </div>
                  </div>

                  <div className="z-10">
                    {step.command === 'approve' && run.status === 'waiting_approval' && step.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleApprove(step.id)}
                          className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                        >
                          Approve
                        </button>
                        <button className="bg-destructive hover:bg-destructive/90 text-destructive-foreground px-4 py-2 rounded-md text-sm font-medium transition-colors">
                          Reject
                        </button>
                      </div>
                    )}
                    {step.status === 'succeeded' && <div className="text-xs font-medium text-green-500">Done</div>}
                    {step.status === 'skipped' && <div className="text-xs font-medium text-muted-foreground">Skipped</div>}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Live Logs */}
      <div className="w-96 border-l border-border bg-[#0D0D0D] flex flex-col text-green-400 font-mono text-xs">
        <div className="p-4 border-b border-border/20 flex items-center gap-2 text-muted-foreground">
          <Terminal className="w-4 h-4" />
          <span>Execution Logs</span>
        </div>
        <div className="flex-1 p-4 overflow-y-auto space-y-2">
          {run.steps.map((step: any) => (
            <div key={`log-${step.id}`}>
              {step.startedAt && <div>&gt; Executing {step.command}...</div>}
              {step.startedAt && <div className="text-blue-400">&gt; Strategy selected: {step.strategy}</div>}
              {stepLogs[step.id] && stepLogs[step.id].map((logChunk, i) => (
                <div key={i} className="text-gray-300 whitespace-pre-wrap">{logChunk}</div>
              ))}
              {step.finishedAt && step.status === 'succeeded' && <div className="text-emerald-400">&gt; Success</div>}
              {step.finishedAt && step.status === 'skipped' && <div className="text-gray-500">&gt; Skipped (condition not met)</div>}
              {step.command === 'approve' && run.status === 'waiting_approval' && step.status === 'pending' && (
                <div className="text-purple-400 animate-pulse">&gt; WAITING FOR HUMAN APPROVAL...</div>
              )}
            </div>
          ))}
          {run.steps.length === 0 && (
            <div className="text-muted-foreground/50">No steps yet...</div>
          )}
        </div>
      </div>
    </div>
  );
}

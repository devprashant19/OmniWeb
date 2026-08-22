import { Handle, Position } from '@xyflow/react';
import clsx from 'clsx';
import { Play, HelpCircle, CheckSquare, RotateCw } from 'lucide-react';

const icons = {
  run: Play,
  if: HelpCircle,
  approve: CheckSquare,
  retry: RotateCw,
};

export default function WorkflowNode({ data, isConnectable }: any) {
  const Icon = icons[data.type as keyof typeof icons] || Play;

  return (
    <div className={clsx(
      "px-4 py-2 shadow-md rounded-md bg-card border-2 flex items-center gap-3 min-w-[150px]",
      data.type === 'run' && "border-blue-500",
      data.type === 'if' && "border-yellow-500",
      data.type === 'approve' && "border-purple-500",
      data.type === 'retry' && "border-green-500",
    )}>
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="!w-3 !h-3 !bg-muted-foreground" />
      
      <div className={clsx(
        "p-2 rounded bg-background",
        data.type === 'run' && "text-blue-500",
        data.type === 'if' && "text-yellow-500",
        data.type === 'approve' && "text-purple-500",
        data.type === 'retry' && "text-green-500",
      )}>
        <Icon className="w-4 h-4" />
      </div>
      
      <div>
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{data.type}</div>
        <div className="text-sm font-medium">{data.label}</div>
      </div>

      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="!w-3 !h-3 !bg-muted-foreground" />
    </div>
  );
}

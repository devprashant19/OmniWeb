import { z } from 'zod';
import YAML from 'yaml';

export const StepSchema = z.object({
  id: z.string(),
  run: z.string().optional(),
  if: z.string().optional(),
  approve: z.object({
    role: z.string(),
    timeout: z.string().optional(),
  }).optional(),
  retry: z.object({
    attempts: z.number(),
    backoff: z.string(),
  }).optional(),
  on_fail: z.enum(['continue', 'abort', 'heal_then_retry']).optional(),
}).refine(data => data.run || data.approve || data.if, {
  message: "Step must have at least one of 'run', 'approve', or 'if'",
});

export const WorkflowSchema = z.object({
  name: z.string(),
  trigger: z.object({
    cron: z.string().optional(),
  }).optional(),
  steps: z.array(StepSchema),
});

export type WorkflowDSL = z.infer<typeof WorkflowSchema>;
export type StepDSL = z.infer<typeof StepSchema>;

export function parseWorkflowYAML(yamlString: string): WorkflowDSL {
  const parsed = YAML.parse(yamlString);
  return WorkflowSchema.parse(parsed);
}

import { FastifyInstance } from 'fastify';
import { prisma } from './db';
import { runWorkflow, resumeWorkflow, triggerSimulatedDrift } from './mockEngine';
import { parseWorkflowYAML } from './workflowParser';
import { z } from 'zod';

export default async function routes(fastify: FastifyInstance) {
  // Workflow endpoints
  fastify.get('/workflows', async (request, reply) => {
    const workflows = await prisma.workflow.findMany({
      include: { tenant: true },
      orderBy: { createdAt: 'desc' }
    });
    return workflows;
  });

  fastify.post('/workflows/run', async (request, reply) => {
    const schema = z.object({
      workflowId: z.string().optional(),
      yaml: z.string().optional(),
      tenantId: z.string()
    });
    const body = schema.parse(request.body);
    
    let workflowId = body.workflowId;
    let dsl;
    
    if (body.yaml) {
      dsl = parseWorkflowYAML(body.yaml);
      const wf = await prisma.workflow.create({
        data: {
          name: dsl.name,
          tenantId: body.tenantId,
          dsl: dsl as any
        }
      });
      workflowId = wf.id;
    } else if (workflowId) {
      const wf = await prisma.workflow.findUnique({ where: { id: workflowId } });
      if (!wf) throw new Error('Workflow not found');
      dsl = wf.dsl as any;
    } else {
      throw new Error('Must provide workflowId or yaml');
    }

    // Start background simulation
    runWorkflow(workflowId!, body.tenantId, dsl).catch(console.error);
    
    // We get the newest run for this workflow to return the ID
    await new Promise(r => setTimeout(r, 500)); // wait for run to be created
    const run = await prisma.run.findFirst({
      where: { workflowId: workflowId! },
      orderBy: { startedAt: 'desc' }
    });

    return { runId: run?.id };
  });

  fastify.get('/runs/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const run = await prisma.run.findUnique({
      where: { id },
      include: { steps: { orderBy: { index: 'asc' } } }
    });
    return run;
  });

  fastify.post('/runs/:id/approve', async (request, reply) => {
    const { id } = request.params as { id: string };
    const schema = z.object({ stepId: z.string() });
    const { stepId } = schema.parse(request.body);
    
    resumeWorkflow(id, stepId).catch(console.error);
    return { success: true };
  });

  // Observatory endpoints
  fastify.get('/stats', async (request, reply) => {
    const runs = await prisma.run.findMany({ include: { steps: true } });
    const adapters = await prisma.adapter.findMany();
    const driftEvents = await prisma.driftEvent.findMany();

    const totalTokensSaved = runs.reduce((sum, run) => sum + run.costTokensSaved, 0);
    const strategyCounts = {
      PUBLIC: 0, COOKIE: 0, INTERCEPT: 0, UI: 0, LOCAL: 0
    };
    runs.forEach(r => r.steps.forEach(s => {
      strategyCounts[s.strategy]++;
    }));

    return { totalTokensSaved, strategyCounts, adapterCount: adapters.length, driftEventCount: driftEvents.length };
  });

  // Healing endpoints
  fastify.get('/healing', async (request, reply) => {
    const events = await prisma.driftEvent.findMany({
      include: { adapter: true },
      orderBy: { detectedAt: 'desc' }
    });
    return events;
  });

  fastify.post('/healing/trigger', async (request, reply) => {
    triggerSimulatedDrift().catch(console.error);
    return { success: true };
  });

  // Tenants & Adapters
  fastify.get('/tenants', async (request, reply) => {
    return prisma.tenant.findMany({ include: { profiles: true } });
  });

  fastify.get('/adapters', async (request, reply) => {
    return prisma.adapter.findMany();
  });
}

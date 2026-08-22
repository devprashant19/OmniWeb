import { prisma } from './db.js';
import { getSocket } from './socket.js';
import { Strategy } from '@prisma/client';
import type { WorkflowDSL } from './workflowParser.js';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function runWorkflow(workflowId: string, tenantId: string, dsl: WorkflowDSL) {
  // 1. Create a new Run
  const run = await prisma.run.create({
    data: {
      workflowId,
      tenantId,
      status: 'running',
    },
  });

  getSocket().emit('run_started', run);

  let costTokensSaved = 0;
  
  // 2. Execute steps
  for (let i = 0; i < dsl.steps.length; i++) {
    const stepDef = dsl.steps[i];
    if (!stepDef) continue; // guard for noUncheckedIndexedAccess

    let command = stepDef.run ?? (stepDef.approve ? 'approve' : 'noop');
    let strategy: Strategy = Strategy.COOKIE;

    // Pick strategy based on command
    if (command.includes('slack') || command.includes('notion')) strategy = Strategy.PUBLIC;
    else if (command.includes('grafana')) strategy = Strategy.LOCAL;
    else if (command === 'approve') strategy = Strategy.LOCAL;

    const step = await prisma.runStep.create({
      data: {
        runId: run.id,
        index: i,
        command,
        strategy,
        status: 'pending',
      },
    });

    getSocket().to(`run_${run.id}`).emit('step_updated', step);

    // If it's an approve step, pause execution
    if (stepDef.approve ?? false) {
      await prisma.runStep.update({ where: { id: step.id }, data: { status: 'pending' } });
      await prisma.run.update({ where: { id: run.id }, data: { status: 'waiting_approval' } });
      getSocket().to(`run_${run.id}`).emit('run_waiting_approval', { runId: run.id, stepId: step.id });
      return; // Execution stops here. It will resume via an API call from the UI.
    }

    // Actually run command
    await prisma.runStep.update({ where: { id: step.id }, data: { status: 'running', startedAt: new Date() } });
    getSocket().to(`run_${run.id}`).emit('step_updated', { ...step, status: 'running' });
    
    if (command.startsWith('webcmd ')) {
      const args = command.replace('webcmd ', '').split(' ');
      const { spawn } = require('child_process');
      const child = spawn('npx', ['--yes', '@agentrhq/webcmd', ...args], { env: { ...process.env, FORCE_COLOR: '1' } });
      
      await new Promise<void>((resolve, reject) => {
        child.stdout.on('data', (data: Buffer) => {
          getSocket().to(`run_${run.id}`).emit('step_log', { stepId: step.id, log: data.toString() });
        });
        child.stderr.on('data', (data: Buffer) => {
          getSocket().to(`run_${run.id}`).emit('step_log', { stepId: step.id, log: data.toString() });
        });
        child.on('close', (code: number) => {
          if (code === 0) resolve();
          else reject(new Error(`Command exited with ${code}`));
        });
      }).catch(err => {
        getSocket().to(`run_${run.id}`).emit('step_log', { stepId: step.id, log: `\nERROR: ${err.message}\n` });
      });
    } else {
      // fallback delay for non-webcmd commands
      await delay(2000);
    }

    // Simulate success metrics
    costTokensSaved += Math.floor(Math.random() * 500) + 100;
    
    await prisma.runStep.update({ 
      where: { id: step.id }, 
      data: { status: 'succeeded', finishedAt: new Date() } 
    });
    
    getSocket().to(`run_${run.id}`).emit('step_updated', { ...step, status: 'succeeded' });
  }

  // Finish run
  await prisma.run.update({
    where: { id: run.id },
    data: { status: 'succeeded', finishedAt: new Date(), costTokensSaved }
  });
  getSocket().to(`run_${run.id}`).emit('run_completed', { runId: run.id, status: 'succeeded' });
}

export async function resumeWorkflow(runId: string, stepId: string) {
  const step = await prisma.runStep.findUnique({ where: { id: stepId }, include: { run: { include: { workflow: true } } } });
  if (!step || !step.run) return;

  const dsl = step.run.workflow.dsl as unknown as WorkflowDSL;

  // Mark approve as succeeded
  await prisma.runStep.update({ where: { id: step.id }, data: { status: 'succeeded', finishedAt: new Date() } });
  getSocket().to(`run_${runId}`).emit('step_updated', { ...step, status: 'succeeded' });
  
  await prisma.run.update({ where: { id: runId }, data: { status: 'running' } });
  getSocket().to(`run_${runId}`).emit('run_resumed', { runId });

  // Continue from next step
  let costTokensSaved = step.run.costTokensSaved;
  for (let i = step.index + 1; i < dsl.steps.length; i++) {
    const stepDef = dsl.steps[i];
    if (!stepDef) continue; // guard for noUncheckedIndexedAccess

    let command = stepDef.run ?? (stepDef.approve ? 'approve' : 'noop');
    const strategy: Strategy = Strategy.PUBLIC;
    
    const nextStep = await prisma.runStep.create({
      data: {
        runId,
        index: i,
        command,
        strategy,
        status: 'running',
        startedAt: new Date(),
      },
    });
    getSocket().to(`run_${runId}`).emit('step_updated', nextStep);

    if (command.startsWith('webcmd ')) {
      const args = command.replace('webcmd ', '').split(' ');
      const { spawn } = require('child_process');
      const child = spawn('npx', ['--yes', '@agentrhq/webcmd', ...args], { env: { ...process.env, FORCE_COLOR: '1' } });
      
      await new Promise<void>((resolve, reject) => {
        child.stdout.on('data', (data: Buffer) => {
          getSocket().to(`run_${runId}`).emit('step_log', { stepId: nextStep.id, log: data.toString() });
        });
        child.stderr.on('data', (data: Buffer) => {
          getSocket().to(`run_${runId}`).emit('step_log', { stepId: nextStep.id, log: data.toString() });
        });
        child.on('close', (code: number) => {
          if (code === 0) resolve();
          else reject(new Error(`Command exited with ${code}`));
        });
      }).catch(err => {
        getSocket().to(`run_${runId}`).emit('step_log', { stepId: nextStep.id, log: `\nERROR: ${err.message}\n` });
      });
    } else {
      await delay(1500);
    }
    costTokensSaved += 250;

    await prisma.runStep.update({ 
      where: { id: nextStep.id }, 
      data: { status: 'succeeded', finishedAt: new Date() } 
    });
    getSocket().to(`run_${runId}`).emit('step_updated', { ...nextStep, status: 'succeeded' });
  }

  await prisma.run.update({
    where: { id: runId },
    data: { status: 'succeeded', finishedAt: new Date(), costTokensSaved }
  });
  getSocket().to(`run_${runId}`).emit('run_completed', { runId, status: 'succeeded' });
}

export async function triggerSimulatedDrift() {
  // Grab a random adapter to fail
  const adapters = await prisma.adapter.findMany();
  if (adapters.length === 0) {
    console.error('[mockEngine] triggerSimulatedDrift: No adapters in DB. Run prisma db seed first.');
    throw new Error('No adapters found. Seed the database before triggering drift.');
  }
  const target = adapters[Math.floor(Math.random() * adapters.length)];
  if (!target) throw new Error('Failed to select a random adapter.'); // guard for noUncheckedIndexedAccess

  const driftEvent = await prisma.driftEvent.create({
    data: {
      adapterId: target.id,
      classification: 'selector_drift',
      status: 'detected',
      diffSummary: 'Target selector .btn-login not found in DOM',
    }
  });

  const fullEvent = await prisma.driftEvent.findUnique({
    where: { id: driftEvent.id },
    include: { adapter: true },
  });

  getSocket().to('healing_events').emit('drift_detected', fullEvent);

  // Simulate Healing pipeline
  setTimeout(async () => {
    await prisma.driftEvent.update({ where: { id: driftEvent.id }, data: { status: 'healing' } });
    getSocket().to('healing_events').emit('drift_updated', { id: driftEvent.id, status: 'healing' });
  }, 4000);

  setTimeout(async () => {
    await prisma.driftEvent.update({ where: { id: driftEvent.id }, data: { status: 'verifying' } });
    getSocket().to('healing_events').emit('drift_updated', { id: driftEvent.id, status: 'verifying' });
  }, 10000);

  setTimeout(async () => {
    await prisma.driftEvent.update({ where: { id: driftEvent.id }, data: { status: 'resolved', resolvedAt: new Date() } });
    getSocket().to('healing_events').emit('drift_updated', { id: driftEvent.id, status: 'resolved' });
  }, 18000);
}

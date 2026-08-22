import { PrismaClient, Strategy } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // 1. Tenants (upsert by name)
  const demoTenant = await prisma.tenant.upsert({
    where: { id: 'seed-tenant-demo' },
    update: {},
    create: { id: 'seed-tenant-demo', name: 'Acme Corp (Demo)' },
  });
  await prisma.tenant.upsert({
    where: { id: 'seed-tenant-spectator' },
    update: {},
    create: { id: 'seed-tenant-spectator', name: 'Spectator (Read-Only)' },
  });

  // 2. Adapters (upsert by commandName)
  const githubAdapter = await prisma.adapter.upsert({
    where: { id: 'seed-adapter-github' },
    update: {},
    create: { id: 'seed-adapter-github', siteName: 'github.com', commandName: 'create-pr', strategy: Strategy.PUBLIC, visibility: 'built_in', successRate: 0.99 },
  });
  const jiraAdapter = await prisma.adapter.upsert({
    where: { id: 'seed-adapter-jira' },
    update: {},
    create: { id: 'seed-adapter-jira', siteName: 'jira.atlassian.com', commandName: 'sprint-progress', strategy: Strategy.COOKIE, visibility: 'plugin', successRate: 0.92 },
  });
  const hrAdapter = await prisma.adapter.upsert({
    where: { id: 'seed-adapter-hr' },
    update: {},
    create: { id: 'seed-adapter-hr', siteName: 'internal-hr.acme.local', commandName: 'approve-pto', strategy: Strategy.UI, visibility: 'private', successRate: 0.74 },
  });

  // 3. Profiles (upsert by id)
  await prisma.profile.upsert({
    where: { id: 'seed-profile-github' },
    update: {},
    create: { id: 'seed-profile-github', tenantId: demoTenant.id, siteName: 'github.com', strategy: Strategy.COOKIE, status: 'active' },
  });
  await prisma.profile.upsert({
    where: { id: 'seed-profile-jira' },
    update: {},
    create: { id: 'seed-profile-jira', tenantId: demoTenant.id, siteName: 'jira.atlassian.com', strategy: Strategy.COOKIE, status: 'active' },
  });
  await prisma.profile.upsert({
    where: { id: 'seed-profile-hr' },
    update: {},
    create: { id: 'seed-profile-hr', tenantId: demoTenant.id, siteName: 'internal-hr.acme.local', strategy: Strategy.UI, status: 'needs_reauth' },
  });

  // 4. Drift Events (upsert by id)
  await prisma.driftEvent.upsert({
    where: { id: 'seed-drift-1' },
    update: {},
    create: { id: 'seed-drift-1', adapterId: hrAdapter.id, classification: 'selector_drift', status: 'resolved', diffSummary: 'Button .submit-pto changed to .btn-primary', resolvedAt: new Date() },
  });
  await prisma.driftEvent.upsert({
    where: { id: 'seed-drift-2' },
    update: {},
    create: { id: 'seed-drift-2', adapterId: jiraAdapter.id, classification: 'auth_expired', status: 'detected', diffSummary: 'Session cookie rejected with 401' },
  });
  await prisma.driftEvent.upsert({
    where: { id: 'seed-drift-3' },
    update: {},
    create: { id: 'seed-drift-3', adapterId: hrAdapter.id, classification: 'site_redesign', status: 'healing', diffSummary: 'Entire DOM structure changed for PTO form' },
  });

  // 5. Workflow (upsert by id)
  const weeklyDigest = await prisma.workflow.upsert({
    where: { id: 'seed-workflow-weekly' },
    update: {},
    create: {
      id: 'seed-workflow-weekly',
      tenantId: demoTenant.id,
      name: 'weekly-pipeline-digest',
      dsl: {
        name: 'weekly-pipeline-digest',
        trigger: { cron: '0 9 * * MON' },
        steps: [
          { id: 'sprint', run: 'webcmd jira sprint-progress --board=eng' },
          { id: 'latency', run: 'webcmd grafana panel-export --dashboard=latency' },
          { id: 'escalate', if: 'steps.sprint.blocked_count > 5', run: 'webcmd slack post --channel=#eng-leads --template=escalation' },
          { id: 'gate', approve: { role: 'eng-manager', timeout: '2h' } },
          { id: 'publish', run: 'webcmd notion append-page --page=weekly-report' },
        ],
      },
    },
  });

  // 6. Past run (upsert by id)
  const pastRun = await prisma.run.upsert({
    where: { id: 'seed-run-1' },
    update: {},
    create: {
      id: 'seed-run-1',
      workflowId: weeklyDigest.id,
      tenantId: demoTenant.id,
      status: 'succeeded',
      costTokensSaved: 1450,
      startedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      finishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 120000),
    },
  });

  // Only seed steps if the run has none yet
  const existingSteps = await prisma.runStep.count({ where: { runId: pastRun.id } });
  if (existingSteps === 0) {
    await prisma.runStep.createMany({
      data: [
        { runId: pastRun.id, index: 0, command: 'webcmd jira sprint-progress --board=eng', strategy: Strategy.COOKIE, status: 'succeeded' },
        { runId: pastRun.id, index: 1, command: 'webcmd grafana panel-export --dashboard=latency', strategy: Strategy.LOCAL, status: 'succeeded' },
        { runId: pastRun.id, index: 2, command: 'webcmd slack post --channel=#eng-leads --template=escalation', strategy: Strategy.PUBLIC, status: 'skipped' },
        { runId: pastRun.id, index: 3, command: 'approve', strategy: Strategy.LOCAL, status: 'succeeded' },
        { runId: pastRun.id, index: 4, command: 'webcmd notion append-page --page=weekly-report', strategy: Strategy.PUBLIC, status: 'succeeded' },
      ],
    });
  }

  console.log('✅ Database seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

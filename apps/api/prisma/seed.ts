import { PrismaClient, Strategy } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // 1. Tenants
  const demoTenant = await prisma.tenant.create({
    data: { name: 'Acme Corp (Demo)' },
  });
  const spectatorTenant = await prisma.tenant.create({
    data: { name: 'Spectator (Read-Only)' },
  });

  // 2. Profiles
  await prisma.profile.createMany({
    data: [
      { tenantId: demoTenant.id, siteName: 'github.com', strategy: Strategy.COOKIE, status: 'active' },
      { tenantId: demoTenant.id, siteName: 'jira.atlassian.com', strategy: Strategy.COOKIE, status: 'active' },
      { tenantId: demoTenant.id, siteName: 'internal-hr.acme.local', strategy: Strategy.UI, status: 'needs_reauth' },
    ],
  });

  // 3. Adapters
  const githubAdapter = await prisma.adapter.create({
    data: { siteName: 'github.com', commandName: 'create-pr', strategy: Strategy.PUBLIC, visibility: 'built_in', successRate: 0.99 },
  });
  const jiraAdapter = await prisma.adapter.create({
    data: { siteName: 'jira.atlassian.com', commandName: 'sprint-progress', strategy: Strategy.COOKIE, visibility: 'plugin', successRate: 0.92 },
  });
  const hrAdapter = await prisma.adapter.create({
    data: { siteName: 'internal-hr.acme.local', commandName: 'approve-pto', strategy: Strategy.UI, visibility: 'private', successRate: 0.74 },
  });

  // 4. Drift Events
  await prisma.driftEvent.createMany({
    data: [
      { adapterId: hrAdapter.id, classification: 'selector_drift', status: 'resolved', diffSummary: 'Button .submit-pto changed to .btn-primary', resolvedAt: new Date() },
      { adapterId: jiraAdapter.id, classification: 'auth_expired', status: 'detected', diffSummary: 'Session cookie rejected with 401' },
      { adapterId: hrAdapter.id, classification: 'site_redesign', status: 'healing', diffSummary: 'Entire DOM structure changed for PTO form' },
    ],
  });

  // 5. Workflows
  const weeklyDigest = await prisma.workflow.create({
    data: {
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

  // 6. Runs & RunSteps
  const pastRun = await prisma.run.create({
    data: {
      workflowId: weeklyDigest.id,
      tenantId: demoTenant.id,
      status: 'succeeded',
      costTokensSaved: 1450,
      startedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
      finishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 120000), // + 2 mins
    },
  });

  await prisma.runStep.createMany({
    data: [
      { runId: pastRun.id, index: 0, command: 'webcmd jira sprint-progress --board=eng', strategy: Strategy.COOKIE, status: 'succeeded' },
      { runId: pastRun.id, index: 1, command: 'webcmd grafana panel-export --dashboard=latency', strategy: Strategy.LOCAL, status: 'succeeded' },
      { runId: pastRun.id, index: 2, command: 'webcmd slack post --channel=#eng-leads --template=escalation', strategy: Strategy.PUBLIC, status: 'skipped' },
      { runId: pastRun.id, index: 3, command: 'approve', strategy: Strategy.LOCAL, status: 'succeeded' },
      { runId: pastRun.id, index: 4, command: 'webcmd notion append-page --page=weekly-report', strategy: Strategy.PUBLIC, status: 'succeeded' },
    ],
  });

  console.log('Database seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

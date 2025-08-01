import { PrismaClient } from '@prisma/client';
import { FEATURE_FLAGS } from '../lib/feature-flags';

const prisma = new PrismaClient();

const featureFlagData = [
  {
    key: FEATURE_FLAGS.API_V2,
    name: 'API Version 2',
    description: 'New REST API with improved performance and features',
    defaultEnabled: false,
    enabledForAll: false,
    percentage: 10,
  },
  {
    key: FEATURE_FLAGS.ADVANCED_SEARCH,
    name: 'Advanced Search',
    description: 'Enhanced search with filters, sorting, and saved searches',
    defaultEnabled: true,
    enabledForAll: false,
  },
  {
    key: FEATURE_FLAGS.BULK_OPERATIONS,
    name: 'Bulk Operations',
    description: 'Perform actions on multiple vehicles at once',
    defaultEnabled: false,
    enabledForAll: false,
    percentage: 50,
  },
  {
    key: FEATURE_FLAGS.NEW_DASHBOARD,
    name: 'New Dashboard',
    description: 'Redesigned dashboard with improved performance',
    defaultEnabled: false,
    enabledForAll: false,
  },
  {
    key: FEATURE_FLAGS.ANALYTICS_DASHBOARD,
    name: 'Analytics Dashboard',
    description: 'Advanced analytics and insights',
    defaultEnabled: false,
    enabledForAll: false,
  },
  {
    key: FEATURE_FLAGS.REAL_TIME_UPDATES,
    name: 'Real-time Updates',
    description: 'Live updates using WebSockets',
    defaultEnabled: false,
    enabledForAll: false,
  },
  {
    key: FEATURE_FLAGS.AI_VEHICLE_VALIDATION,
    name: 'AI Vehicle Validation',
    description: 'AI-powered vehicle data validation',
    defaultEnabled: true,
    enabledForAll: false,
  },
  {
    key: FEATURE_FLAGS.VEHICLE_HISTORY,
    name: 'Vehicle History',
    description: 'Track full vehicle history and changes',
    defaultEnabled: false,
    enabledForAll: false,
  },
  {
    key: FEATURE_FLAGS.VEHICLE_COMPARISON_V2,
    name: 'Vehicle Comparison 2.0',
    description: 'Enhanced vehicle comparison with more features',
    defaultEnabled: false,
    enabledForAll: false,
    percentage: 25,
  },
  {
    key: FEATURE_FLAGS.TEAM_COLLABORATION,
    name: 'Team Collaboration',
    description: 'Comments, mentions, and shared workspaces',
    defaultEnabled: false,
    enabledForAll: false,
  },
  {
    key: FEATURE_FLAGS.TEAM_ACTIVITY_FEED,
    name: 'Team Activity Feed',
    description: 'See what your team is working on',
    defaultEnabled: false,
    enabledForAll: false,
  },
  {
    key: FEATURE_FLAGS.ADVANCED_EXPORTS,
    name: 'Advanced Exports',
    description: 'Export data in multiple formats with custom templates',
    defaultEnabled: true,
    enabledForAll: false,
  },
  {
    key: FEATURE_FLAGS.CUSTOM_REPORTS,
    name: 'Custom Reports',
    description: 'Build and save custom reports',
    defaultEnabled: false,
    enabledForAll: false,
  },
  {
    key: FEATURE_FLAGS.WEBHOOK_INTEGRATIONS,
    name: 'Webhook Integrations',
    description: 'Send data to external systems via webhooks',
    defaultEnabled: false,
    enabledForAll: false,
  },
  {
    key: FEATURE_FLAGS.THIRD_PARTY_SYNC,
    name: 'Third-party Sync',
    description: 'Sync data with CRM and inventory systems',
    defaultEnabled: false,
    enabledForAll: false,
  },
];

async function main() {
  console.log('Seeding feature flags...');

  for (const flag of featureFlagData) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: {
        name: flag.name,
        description: flag.description,
      },
      create: flag,
    });
    console.log(`Created/updated feature flag: ${flag.key}`);
  }

  console.log('Feature flags seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
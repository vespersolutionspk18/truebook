import { emailWorker, closeEmailWorker } from './workers/email.worker';
import { cleanupWorker, closeCleanupWorker } from './workers/cleanup.worker';
import { logger } from '@/lib/logger';
import { scheduleCleanup } from './queue';

// Export queue functions
export { sendEmail, scheduleCleanup, generateReport } from './queue';

// Start all workers
export async function startWorkers() {
  logger.info('Starting background job workers');

  // Schedule recurring cleanup jobs
  try {
    // Clean up expired invitations daily at 2 AM
    await scheduleCleanup(
      { type: 'expired-invitations' },
      { repeat: { cron: '0 2 * * *' } }
    );

    // Clean up old logs weekly on Sunday at 3 AM
    await scheduleCleanup(
      { type: 'old-logs', daysOld: 90 },
      { repeat: { cron: '0 3 * * 0' } }
    );

    // Clean up unused API keys monthly on the 1st at 4 AM
    await scheduleCleanup(
      { type: 'unused-api-keys', daysOld: 180 },
      { repeat: { cron: '0 4 1 * *' } }
    );

    logger.info('Scheduled recurring cleanup jobs');
  } catch (error) {
    logger.error('Failed to schedule cleanup jobs', { error });
  }

  // Workers are automatically started when imported
  logger.info('Background job workers started');
}

// Graceful shutdown
export async function stopWorkers() {
  logger.info('Stopping background job workers');

  await Promise.all([
    closeEmailWorker(),
    closeCleanupWorker(),
  ]);

  logger.info('Background job workers stopped');
}

// Handle process signals
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down workers');
  await stopWorkers();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down workers');
  await stopWorkers();
  process.exit(0);
});
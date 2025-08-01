import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { CleanupJobData } from '../queue';
import { logger } from '@/lib/logger';
import { db } from '@/lib/db';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export const cleanupWorker = new Worker<CleanupJobData>(
  'cleanup',
  async (job: Job<CleanupJobData>) => {
    const { type, daysOld = 7 } = job.data;

    logger.info('Processing cleanup job', {
      jobId: job.id,
      type,
      daysOld,
    });

    try {
      let deletedCount = 0;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      switch (type) {
        case 'expired-invitations':
          const expiredInvitations = await db.invitation.deleteMany({
            where: {
              expiresAt: {
                lt: new Date(),
              },
            },
          });
          deletedCount = expiredInvitations.count;
          break;

        case 'old-logs':
          const oldLogs = await db.auditLog.deleteMany({
            where: {
              createdAt: {
                lt: cutoffDate,
              },
            },
          });
          deletedCount = oldLogs.count;
          break;

        case 'unused-api-keys':
          // Delete API keys that haven't been used in X days
          const unusedKeys = await db.apiKey.deleteMany({
            where: {
              AND: [
                {
                  lastUsedAt: {
                    lt: cutoffDate,
                  },
                },
                {
                  createdAt: {
                    lt: cutoffDate,
                  },
                },
              ],
            },
          });
          deletedCount = unusedKeys.count;
          break;

        default:
          throw new Error(`Unknown cleanup type: ${type}`);
      }

      logger.info('Cleanup completed', {
        jobId: job.id,
        type,
        deletedCount,
      });

      return { success: true, deletedCount, completedAt: new Date() };
    } catch (error) {
      logger.error('Failed to process cleanup job', {
        jobId: job.id,
        type,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  },
  {
    connection,
    concurrency: 1, // Run one cleanup at a time
  }
);

// Error handling
cleanupWorker.on('completed', (job) => {
  logger.info('Cleanup job completed', { jobId: job.id });
});

cleanupWorker.on('failed', (job, err) => {
  logger.error('Cleanup job failed', {
    jobId: job?.id,
    error: err.message,
    stack: err.stack,
  });
});

// Graceful shutdown
export async function closeCleanupWorker() {
  await cleanupWorker.close();
  await connection.quit();
}
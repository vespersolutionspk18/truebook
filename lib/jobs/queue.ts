import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from '@/lib/logger';

// Redis connection for BullMQ
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// Define job types
export interface EmailJobData {
  to: string;
  subject: string;
  template: 'invitation' | 'welcome' | 'reset-password' | 'api-key-created';
  data: Record<string, any>;
}

export interface CleanupJobData {
  type: 'expired-invitations' | 'old-logs' | 'unused-api-keys';
  daysOld?: number;
}

export interface UsageReportJobData {
  organizationId: string;
  period: 'daily' | 'weekly' | 'monthly';
  email: string;
}

// Create queues
export const emailQueue = new Queue<EmailJobData>('email', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 3600, // keep completed jobs for 1 hour
      count: 100, // keep max 100 completed jobs
    },
    removeOnFail: {
      age: 24 * 3600, // keep failed jobs for 24 hours
    },
  },
});

export const cleanupQueue = new Queue<CleanupJobData>('cleanup', {
  connection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: true,
    removeOnFail: {
      age: 7 * 24 * 3600, // keep failed jobs for 7 days
    },
  },
});

export const reportQueue = new Queue<UsageReportJobData>('reports', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 5000,
    },
    removeOnComplete: {
      age: 24 * 3600, // keep for 24 hours
    },
  },
});

// Helper functions to add jobs
export async function sendEmail(data: EmailJobData, options?: { delay?: number; priority?: number }) {
  try {
    const job = await emailQueue.add('send-email', data, options);
    logger.info('Email job queued', { jobId: job.id, to: data.to, template: data.template });
    return job;
  } catch (error) {
    logger.error('Failed to queue email job', { error, data });
    throw error;
  }
}

export async function scheduleCleanup(data: CleanupJobData, options?: { repeat?: { cron: string } }) {
  try {
    const job = await cleanupQueue.add('cleanup', data, options);
    logger.info('Cleanup job scheduled', { jobId: job.id, type: data.type });
    return job;
  } catch (error) {
    logger.error('Failed to schedule cleanup job', { error, data });
    throw error;
  }
}

export async function generateReport(data: UsageReportJobData, options?: { delay?: number }) {
  try {
    const job = await reportQueue.add('generate-report', data, options);
    logger.info('Report job queued', { jobId: job.id, organizationId: data.organizationId, period: data.period });
    return job;
  } catch (error) {
    logger.error('Failed to queue report job', { error, data });
    throw error;
  }
}

// Graceful shutdown
export async function closeQueues() {
  await Promise.all([
    emailQueue.close(),
    cleanupQueue.close(),
    reportQueue.close(),
  ]);
  await connection.quit();
}
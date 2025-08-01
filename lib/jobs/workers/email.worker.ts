import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { EmailJobData } from '../queue';
import { logger } from '@/lib/logger';
import { sendInvitationEmail, sendWelcomeEmail, sendApiKeyEmail } from '@/lib/email';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export const emailWorker = new Worker<EmailJobData>(
  'email',
  async (job: Job<EmailJobData>) => {
    const { to, subject, template, data } = job.data;

    logger.info('Processing email job', {
      jobId: job.id,
      to,
      template,
      attempt: job.attemptsMade,
    });

    try {
      switch (template) {
        case 'invitation':
          await sendInvitationEmail(to, data.inviteUrl, data.organizationName, data.role);
          break;
        case 'welcome':
          await sendWelcomeEmail(to, data.name, data.organizationName);
          break;
        case 'api-key-created':
          await sendApiKeyEmail(to, data.keyName, data.organizationName);
          break;
        default:
          throw new Error(`Unknown email template: ${template}`);
      }

      logger.info('Email sent successfully', { jobId: job.id, to, template });
      return { success: true, sentAt: new Date() };
    } catch (error) {
      logger.error('Failed to send email', {
        jobId: job.id,
        to,
        template,
        error: error instanceof Error ? error.message : 'Unknown error',
        attempt: job.attemptsMade,
      });
      throw error;
    }
  },
  {
    connection,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000, // 10 emails per second
    },
  }
);

// Error handling
emailWorker.on('completed', (job) => {
  logger.info('Email job completed', { jobId: job.id });
});

emailWorker.on('failed', (job, err) => {
  logger.error('Email job failed', {
    jobId: job?.id,
    error: err.message,
    stack: err.stack,
  });
});

emailWorker.on('stalled', (jobId) => {
  logger.warn('Email job stalled', { jobId });
});

// Graceful shutdown
export async function closeEmailWorker() {
  await emailWorker.close();
  await connection.quit();
}
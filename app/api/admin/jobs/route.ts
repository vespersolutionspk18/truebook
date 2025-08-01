import { NextRequest, NextResponse } from 'next/server';
import { requireOrgRole } from '@/lib/auth';
import { emailQueue, cleanupQueue, reportQueue } from '@/lib/jobs/queue';
import { logger } from '@/lib/logger';

// GET /api/admin/jobs - Get job statistics
export const GET = requireOrgRole(
  ['OWNER', 'ADMIN'],
  async (req: NextRequest, context) => {
    try {
      // Get queue statistics
      const [emailStats, cleanupStats, reportStats] = await Promise.all([
        getQueueStats(emailQueue),
        getQueueStats(cleanupQueue),
        getQueueStats(reportQueue),
      ]);

      return NextResponse.json({
        email: emailStats,
        cleanup: cleanupStats,
        reports: reportStats,
      });
    } catch (error) {
      logger.error('Failed to fetch job statistics', {
        organizationId: context.organization.id,
        error,
      });
      return new NextResponse('Internal Server Error', { status: 500 });
    }
  }
);

async function getQueueStats(queue: any) {
  const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
    queue.getPausedCount(),
  ]);

  const jobs = await queue.getJobs(['completed', 'failed'], 0, 10);

  return {
    name: queue.name,
    counts: {
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused,
    },
    recentJobs: jobs.map((job: any) => ({
      id: job.id,
      name: job.name,
      data: job.data,
      timestamp: job.timestamp,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
      processedOn: job.processedOn,
    })),
  };
}
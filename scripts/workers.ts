#!/usr/bin/env ts-node

import { startWorkers } from '@/lib/jobs';
import { logger } from '@/lib/logger';

async function main() {
  try {
    logger.info('Starting job workers...');
    await startWorkers();
    logger.info('Job workers started successfully');

    // Keep the process running
    process.stdin.resume();
  } catch (error) {
    logger.error('Failed to start workers', { error });
    process.exit(1);
  }
}

main();
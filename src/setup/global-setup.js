const fs = require('node:fs');
const path = require('node:path');
const env = require('../config/env');
const { createLogger } = require('../utils/logger');
const { runHealthCheck } = require('./health-check');

module.exports = async () => {
  const logger = createLogger('global-setup');
  logger.info('Starting API automation run', {
    environment: env.name,
    baseUrl: env.baseUrl,
    workers: env.workers,
  });

  const report = await runHealthCheck();

  try {
    fs.mkdirSync(env.paths.reports, { recursive: true });
    fs.writeFileSync(
      path.join(env.paths.reports, 'environment.json'),
      `${JSON.stringify(
        {
          environment: env.name,
          baseUrl: env.baseUrl,
          nodeVersion: process.version,
          platform: process.platform,
          ci: env.isCI,
          workers: env.workers,
          startedAt: new Date().toISOString(),
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
  } catch (error) {
    logger.debug('Unable to persist environment metadata', { error: error.message });
  }

  logger.info('Global setup complete', { healthCheckPassed: report.passed });
};

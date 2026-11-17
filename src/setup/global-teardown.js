const env = require('../config/env');
const { createLogger } = require('../utils/logger');

module.exports = async () => {
  const logger = createLogger('global-teardown');
  logger.info('API automation run finished', {
    environment: env.name,
    baseUrl: env.baseUrl,
    finishedAt: new Date().toISOString(),
    reports: 'reports/',
  });
};

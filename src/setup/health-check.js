const fs = require('node:fs');
const path = require('node:path');
const env = require('../config/env');
const { ApiClient } = require('../api/ApiClient');
const { createLogger } = require('../utils/logger');

async function runHealthCheck({ strict = env.healthCheckStrict } = {}) {
  const logger = createLogger('health-check');
  const checks = [];
  const client = await ApiClient.create({
    baseUrl: env.baseUrl,
    timeout: env.timeout,
    retries: 0,
    logger,
  });

  try {
    const productResponse = await client.get('/products/1', { timeout: env.timeout });
    checks.push({
      name: 'GET /products/1',
      passed: productResponse.ok && productResponse.isJson,
      status: productResponse.status,
      durationMs: Math.round(productResponse.duration),
    });

    const loginResponse = await client.post('/auth/login', {
      data: env.credentials,
      timeout: env.timeout,
    });
    checks.push({
      name: 'POST /auth/login',
      passed:
        loginResponse.status === 200 && Boolean(loginResponse.data?.accessToken),
      status: loginResponse.status,
      durationMs: Math.round(loginResponse.duration),
    });
  } catch (error) {
    checks.push({
      name: 'connectivity',
      passed: false,
      error: error.message,
    });
  } finally {
    await client.dispose();
  }

  const report = {
    environment: env.name,
    baseUrl: env.baseUrl,
    timestamp: new Date().toISOString(),
    passed: checks.every((check) => check.passed),
    checks,
  };

  try {
    fs.mkdirSync(env.paths.reports, { recursive: true });
    fs.writeFileSync(
      path.join(env.paths.reports, 'health-check.json'),
      `${JSON.stringify(report, null, 2)}\n`,
      'utf8',
    );
  } catch (error) {
    logger.debug('Unable to persist health-check report', { error: error.message });
  }

  if (report.passed) {
    logger.info('API health check passed', {
      baseUrl: env.baseUrl,
      checks: checks.map((check) => `${check.name}=${check.status ?? 'ERR'}`),
    });
    return report;
  }

  const message = `API health check failed for ${env.baseUrl}: ${JSON.stringify(checks)}`;
  logger.error('API health check failed', { baseUrl: env.baseUrl, checks });

  if (strict) throw new Error(message);
  return report;
}

if (require.main === module) {
  runHealthCheck()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exitCode = report.passed ? 0 : 1;
    })
    .catch((error) => {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
    });
}

module.exports = { runHealthCheck };

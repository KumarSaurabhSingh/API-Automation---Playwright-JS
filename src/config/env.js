const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const ROOT_DIR = path.resolve(__dirname, '../..');

function readString(name, fallback) {
  const value = process.env[name];
  return value === undefined || value.trim() === '' ? fallback : value.trim();
}

function readInt(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function readBool(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase());
}

function trimTrailingSlashes(url) {
  return url.replace(/\/+$/, '');
}

const env = Object.freeze({
  name: readString('TEST_ENV', 'qa'),
  baseUrl: trimTrailingSlashes(readString('BASE_URL', 'https://dummyjson.com')),
  timeout: readInt('API_TIMEOUT_MS', 30000),
  retries: readInt('API_RETRIES', 1),
  retryDelayMs: readInt('API_RETRY_DELAY_MS', 750),
  maxRetries: 5,
  maxRedirects: readInt('API_MAX_REDIRECTS', 5),
  workers: readInt('WORKERS', 2),
  logLevel: readString('LOG_LEVEL', 'info').toLowerCase(),
  logToFile: readBool('LOG_TO_FILE', true),
  healthCheckStrict: readBool('HEALTH_CHECK_STRICT', true),
  isCI: Boolean(process.env.CI),
  credentials: Object.freeze({
    username: readString('AUTH_USERNAME', 'emilys'),
    password: readString('AUTH_PASSWORD', 'emilyspass'),
  }),
  defaults: Object.freeze({
    accept: 'application/json',
    userAgent: 'playwright-api-automation/1.0',
  }),
  retryableStatuses: Object.freeze([408, 425, 429, 500, 502, 503, 504]),
  paths: Object.freeze({
    root: ROOT_DIR,
    src: path.join(ROOT_DIR, 'src'),
    tests: path.join(ROOT_DIR, 'tests'),
    reports: path.join(ROOT_DIR, 'reports'),
    logs: path.join(ROOT_DIR, 'logs'),
    schemas: path.join(ROOT_DIR, 'src', 'schemas'),
  }),
});

module.exports = env;

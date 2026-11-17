const fs = require('node:fs');
const path = require('node:path');
const env = require('../config/env');
const { REDACTED } = require('../constants');

const LEVELS = Object.freeze({ error: 0, warn: 1, info: 2, debug: 3 });
const COLORS = Object.freeze({
  error: '\x1b[31m',
  warn: '\x1b[33m',
  info: '\x1b[36m',
  debug: '\x1b[90m',
  reset: '\x1b[0m',
});

const SENSITIVE_KEY_PATTERN = /(authorization|token|password|secret|api[-_]?key|cookie|credential)/i;
const JWT_PATTERN = /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const useColor = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;

let logFileReady = false;
let resolvedLogFile = null;

function ensureLogFile() {
  if (!env.logToFile) return null;
  if (logFileReady) return resolvedLogFile;

  const date = new Date().toISOString().slice(0, 10);
  const filePath = path.join(env.paths.logs, `api-automation-${date}.log`);

  try {
    fs.mkdirSync(env.paths.logs, { recursive: true });
    fs.appendFileSync(filePath, '');
    resolvedLogFile = filePath;
    logFileReady = true;
  } catch {
    logFileReady = false;
    resolvedLogFile = null;
  }

  return resolvedLogFile;
}

function sanitize(value, seen = new WeakSet(), depth = 0) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return JWT_PATTERN.test(value) ? REDACTED : value;
  if (typeof value !== 'object') return value;
  if (depth > 8) return '[MAX_DEPTH]';
  if (seen.has(value)) return '[CIRCULAR]';

  seen.add(value);

  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item, seen, depth + 1));
  }

  const result = {};
  for (const [key, item] of Object.entries(value)) {
    result[key] = SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : sanitize(item, seen, depth + 1);
  }
  return result;
}

function stringify(value) {
  try {
    return JSON.stringify(sanitize(value));
  } catch {
    return '[Unserializable]';
  }
}

class Logger {
  constructor(scope = 'app', options = {}) {
    this.scope = scope;
    const requestedLevel = String(options.level || env.logLevel || 'info').toLowerCase();
    this.level = requestedLevel in LEVELS ? requestedLevel : 'info';
    this.consoleEnabled = options.console !== false;
  }

  child(scope, options = {}) {
    return new Logger(`${this.scope}:${scope}`, {
      level: this.level,
      console: this.consoleEnabled,
      ...options,
    });
  }

  isLevelEnabled(level) {
    return LEVELS[level] <= LEVELS[this.level];
  }

  error(message, meta) {
    this.write('error', message, meta);
  }

  warn(message, meta) {
    this.write('warn', message, meta);
  }

  info(message, meta) {
    this.write('info', message, meta);
  }

  debug(message, meta) {
    this.write('debug', message, meta);
  }

  write(level, message, meta) {
    if (!this.isLevelEnabled(level)) return;

    const timestamp = new Date().toISOString();
    const metadata = meta === undefined ? '' : ` ${stringify(meta)}`;
    const line = `${timestamp} ${level.toUpperCase().padEnd(5)} [${this.scope}] ${message}${metadata}`;

    if (this.consoleEnabled) {
      const color = useColor ? COLORS[level] : '';
      const reset = useColor ? COLORS.reset : '';
      process.stdout.write(`${color}${line}${reset}\n`);
    }

    const filePath = ensureLogFile();
    if (filePath) {
      try {
        fs.appendFileSync(filePath, `${line}\n`);
      } catch {
        // File logging is best-effort and must never break a test run.
      }
    }
  }
}

function createLogger(scope, options) {
  return new Logger(scope, options);
}

module.exports = { createLogger, sanitize, Logger, LEVELS };

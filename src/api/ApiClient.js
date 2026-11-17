const env = require('../config/env');
const { HEADERS, CONTENT_TYPES } = require('../constants');
const { createLogger, sanitize } = require('../utils/logger');
const { sleep, nowMs } = require('../utils/time');
const { randomUuid } = require('../utils/data-generator');
const { ApiResponse } = require('./ApiResponse');

class ApiClientError extends Error {
  constructor(message, { method, url, attempts, cause } = {}) {
    super(message);
    this.name = 'ApiClientError';
    this.method = method;
    this.url = url;
    this.attempts = attempts;
    if (cause) this.cause = cause;
  }
}

function normalizeRetries(value) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return 0;
  return Math.min(Math.max(parsed, 0), env.maxRetries);
}

class ApiClient {
  constructor(context, options = {}) {
    if (!context) {
      throw new Error('ApiClient requires a Playwright APIRequestContext instance');
    }

    this.context = context;
    this.baseUrl = (options.baseUrl || env.baseUrl).replace(/\/+$/, '');
    this.timeout = options.timeout ?? env.timeout;
    this.retries = normalizeRetries(options.retries ?? env.retries);
    this.retryDelayMs = options.retryDelayMs ?? env.retryDelayMs;
    this.maxRedirects = options.maxRedirects ?? env.maxRedirects;
    this.headers = { ...(options.headers || {}) };
    this.retryableStatuses = new Set(options.retryableStatuses || env.retryableStatuses);
    this.logger = options.logger || createLogger('api');
    this.ownsContext = Boolean(options.ownsContext);
    this.historyLimit = options.historyLimit ?? 50;
    this.history = [];
    this.stats = this.createEmptyStats();
  }

  static async create(options = {}) {
    const { request } = require('@playwright/test');
    const context = await request.newContext({
      baseURL: options.baseUrl || env.baseUrl,
      timeout: options.timeout ?? env.timeout,
      ignoreHTTPSErrors: options.ignoreHTTPSErrors ?? true,
      extraHTTPHeaders: options.headers || {},
    });
    return new ApiClient(context, { ...options, ownsContext: true });
  }

  createEmptyStats() {
    return {
      requests: 0,
      attempts: 0,
      retries: 0,
      failures: 0,
      totalDurationMs: 0,
      statusCounts: {},
    };
  }

  get(path, options) {
    return this.request('GET', path, options);
  }

  post(path, options) {
    return this.request('POST', path, options);
  }

  put(path, options) {
    return this.request('PUT', path, options);
  }

  patch(path, options) {
    return this.request('PATCH', path, options);
  }

  delete(path, options) {
    return this.request('DELETE', path, options);
  }

  head(path, options) {
    return this.request('HEAD', path, options);
  }

  options(path, options) {
    return this.request('OPTIONS', path, options);
  }

  buildUrl(path, query) {
    if (typeof path !== 'string' || path.trim() === '') {
      throw new TypeError('ApiClient path must be a non-empty string');
    }

    const base = `${this.baseUrl}/`;
    const target = /^https?:\/\//i.test(path)
      ? new URL(path)
      : new URL(path.replace(/^\/+/, ''), base);

    if (query) {
      for (const [key, rawValue] of Object.entries(query)) {
        if (rawValue === undefined || rawValue === null) continue;
        const values = Array.isArray(rawValue) ? rawValue : [rawValue];
        for (const value of values) {
          if (value === undefined || value === null) continue;
          target.searchParams.append(key, String(value));
        }
      }
    }

    return target.toString();
  }

  buildHeaders({ options, requestId, hasJsonData }) {
    const headers = {
      [HEADERS.ACCEPT]: env.defaults.accept,
      'User-Agent': env.defaults.userAgent,
      [HEADERS.REQUEST_ID]: requestId,
      ...(hasJsonData ? { [HEADERS.CONTENT_TYPE]: CONTENT_TYPES.JSON } : {}),
      ...this.headers,
      ...(options.headers || {}),
    };

    if (options.authToken) {
      const hasAuthorization = Object.keys(headers).some(
        (key) => key.toLowerCase() === HEADERS.AUTHORIZATION.toLowerCase(),
      );
      if (!hasAuthorization) {
        headers[HEADERS.AUTHORIZATION] = `Bearer ${options.authToken}`;
      }
    }

    for (const key of Object.keys(headers)) {
      if (headers[key] === undefined) delete headers[key];
    }

    return headers;
  }

  computeRetryDelay(attempt, response) {
    const maxDelayMs = 30000;

    if (response) {
      const retryAfter = response.header(HEADERS.RETRY_AFTER);
      if (retryAfter) {
        const seconds = Number(retryAfter);
        if (!Number.isNaN(seconds)) {
          return Math.min(Math.max(seconds * 1000, 0), maxDelayMs);
        }
        const retryDate = Date.parse(retryAfter);
        if (!Number.isNaN(retryDate)) {
          return Math.min(Math.max(retryDate - Date.now(), 0), maxDelayMs);
        }
      }

      if (response.status === 429) {
        return Math.min(Math.max(this.retryDelayMs, 1000) * attempt, maxDelayMs);
      }
    }

    const exponential = this.retryDelayMs * 2 ** (attempt - 1);
    const jitter = Math.floor(Math.random() * 250);
    return Math.min(exponential + jitter, maxDelayMs);
  }

  record(response) {
    this.stats.requests += 1;
    this.stats.totalDurationMs += response.duration;
    const key = String(response.status);
    this.stats.statusCounts[key] = (this.stats.statusCounts[key] || 0) + 1;

    this.history.push(sanitize(response.toJSON()));
    if (this.history.length > this.historyLimit) {
      this.history.shift();
    }
  }

  logResponse(response, attempt, totalAttempts) {
    const message = `<- ${response.status} ${response.request.method} ${response.url}`;
    const meta = {
      durationMs: Math.round(response.duration),
      attempt,
      maxAttempts: totalAttempts,
      requestId: response.requestId,
      contentType: response.contentType,
      sizeBytes: response.size,
    };

    if (response.status >= 500) {
      this.logger.error(message, meta);
    } else if (response.duration > 2000) {
      this.logger.warn(`${message} (slow response)`, meta);
    } else {
      this.logger.debug(message, meta);
    }
  }

  async request(method, path, options = {}) {
    const normalizedMethod = String(method || '').toUpperCase();
    if (!/^[A-Z]+$/.test(normalizedMethod)) {
      throw new TypeError(`Invalid HTTP method: ${method}`);
    }

    const hasJsonData = options.data !== undefined;
    const hasForm = options.form !== undefined;
    const hasMultipart = options.multipart !== undefined;
    const bodyKinds = [hasJsonData, hasForm, hasMultipart].filter(Boolean).length;
    if (bodyKinds > 1) {
      throw new TypeError('Provide only one of "data", "form" or "multipart" in a request');
    }

    const query = options.query ?? options.params;
    const url = this.buildUrl(path, query);
    const totalAttempts = normalizeRetries(options.retries ?? this.retries) + 1;
    const requestId = randomUuid();
    let lastError;

    for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
      const headers = this.buildHeaders({ options, requestId, hasJsonData });
      const startedAt = nowMs();
      this.stats.attempts += 1;

      this.logger.debug(`-> ${normalizedMethod} ${url}`, {
        attempt,
        maxAttempts: totalAttempts,
        requestId,
        headers: sanitize(headers),
        body: hasJsonData ? sanitize(options.data) : undefined,
      });

      try {
        const rawResponse = await this.context.fetch(url, {
          method: normalizedMethod,
          headers,
          data: hasJsonData ? options.data : undefined,
          form: hasForm ? options.form : undefined,
          multipart: hasMultipart ? options.multipart : undefined,
          timeout: options.timeout ?? this.timeout,
          maxRedirects: options.maxRedirects ?? this.maxRedirects,
          failOnStatusCode: false,
          ignoreHTTPSErrors: options.ignoreHTTPSErrors ?? true,
        });

        const duration = nowMs() - startedAt;
        const response = await ApiResponse.fromPlaywright(rawResponse, {
          method: normalizedMethod,
          url,
          duration,
          requestId,
          request: {
            method: normalizedMethod,
            url,
            headers: sanitize(headers),
            body: hasJsonData ? sanitize(options.data) : undefined,
            attempt,
          },
        });

        this.record(response);
        this.logResponse(response, attempt, totalAttempts);

        if (attempt < totalAttempts && this.retryableStatuses.has(response.status)) {
          this.stats.retries += 1;
          const delay = this.computeRetryDelay(attempt, response);
          this.logger.warn(`Retrying ${normalizedMethod} ${url} after HTTP ${response.status}`, {
            attempt,
            delayMs: Math.round(delay),
            requestId,
          });
          await sleep(delay);
          continue;
        }

        return response;
      } catch (error) {
        lastError = error;
        const duration = nowMs() - startedAt;
        this.logger.warn(`Request error: ${normalizedMethod} ${url}`, {
          attempt,
          durationMs: Math.round(duration),
          error: error.message,
          requestId,
        });

        if (attempt < totalAttempts) {
          this.stats.retries += 1;
          const delay = this.computeRetryDelay(attempt);
          await sleep(delay);
          continue;
        }

        this.stats.failures += 1;
        throw new ApiClientError(
          `Request failed after ${totalAttempts} attempt(s): ${normalizedMethod} ${url} - ${error.message}`,
          { method: normalizedMethod, url, attempts: totalAttempts, cause: error },
        );
      }
    }

    throw new ApiClientError(
      `Request failed: ${normalizedMethod} ${url} - ${lastError?.message || 'unknown error'}`,
      { method: normalizedMethod, url, attempts: totalAttempts, cause: lastError },
    );
  }

  withHeaders(headers) {
    return new ApiClient(this.context, {
      baseUrl: this.baseUrl,
      timeout: this.timeout,
      retries: this.retries,
      retryDelayMs: this.retryDelayMs,
      maxRedirects: this.maxRedirects,
      headers: { ...this.headers, ...headers },
      retryableStatuses: [...this.retryableStatuses],
      logger: this.logger,
      historyLimit: this.historyLimit,
    });
  }

  withAuth(token) {
    return this.withHeaders({ [HEADERS.AUTHORIZATION]: `Bearer ${token}` });
  }

  withoutAuth() {
    const headers = { ...this.headers };
    for (const key of Object.keys(headers)) {
      if (key.toLowerCase() === 'authorization') delete headers[key];
    }
    return new ApiClient(this.context, {
      baseUrl: this.baseUrl,
      timeout: this.timeout,
      retries: this.retries,
      retryDelayMs: this.retryDelayMs,
      maxRedirects: this.maxRedirects,
      headers,
      retryableStatuses: [...this.retryableStatuses],
      logger: this.logger,
      historyLimit: this.historyLimit,
    });
  }

  getStats() {
    const requests = this.stats.requests || 1;
    return {
      ...this.stats,
      statusCounts: { ...this.stats.statusCounts },
      avgDurationMs: Math.round(this.stats.totalDurationMs / requests),
    };
  }

  getHistory() {
    return this.history.map((entry) => ({ ...entry }));
  }

  resetStats() {
    this.stats = this.createEmptyStats();
    this.history = [];
  }

  async dispose() {
    if (this.ownsContext && this.context) {
      await this.context.dispose();
    }
  }
}

module.exports = { ApiClient, ApiClientError };

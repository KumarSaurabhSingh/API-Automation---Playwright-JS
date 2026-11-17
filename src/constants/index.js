const HTTP_STATUS = Object.freeze({
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
});

const HEADERS = Object.freeze({
  ACCEPT: 'Accept',
  AUTHORIZATION: 'Authorization',
  CONTENT_TYPE: 'Content-Type',
  RETRY_AFTER: 'Retry-After',
  REQUEST_ID: 'X-Request-Id',
  RATE_LIMIT_LIMIT: 'x-ratelimit-limit',
  RATE_LIMIT_REMAINING: 'x-ratelimit-remaining',
  CONTENT_TYPE_OPTIONS: 'x-content-type-options',
  ACCESS_CONTROL_ALLOW_ORIGIN: 'access-control-allow-origin',
  ACCESS_CONTROL_ALLOW_METHODS: 'access-control-allow-methods',
});

const CONTENT_TYPES = Object.freeze({
  JSON: 'application/json',
  FORM: 'application/x-www-form-urlencoded',
  MULTIPART: 'multipart/form-data',
  TEXT: 'text/plain',
});

const REDACTED = '[REDACTED]';

module.exports = { HTTP_STATUS, HEADERS, CONTENT_TYPES, REDACTED };

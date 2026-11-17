# Playwright API Automation Framework

A production-grade API automation framework built with **Playwright Test** and **JavaScript**. It provides a typed-by-convention service layer, reusable fixtures, JSON Schema contract validation, automatic retries, structured logging, environment configuration, and multi-format reporting.

The executable suite targets the public [DummyJSON](https://dummyjson.com) API, so every test in this repository runs against a live HTTP service without local mocks.

## Highlights

- Playwright's `APIRequestContext` with a hardened `ApiClient` wrapper
- Automatic retries for transient failures (HTTP 408, 425, 429, 5xx and network errors)
- Exponential backoff with `Retry-After` support
- Request/response logging with automatic secret redaction
- JSON Schema contract validation powered by Ajv
- Reusable service objects, builders, and fixtures
- Worker-scoped authentication (one login per worker, not per test)
- HTML, JSON, JUnit, custom Markdown and console reporters
- Global health check before the suite runs and environment metadata capture
- Failure-only API call history attached to Playwright reports
- Environment-driven configuration through `.env`
- Parallel execution with rate-limit friendly defaults
- 49 executable tests across 8 spec files

## Tech Stack

| Tool | Purpose |
| --- | --- |
| Node.js 18+ | Runtime |
| Playwright Test 1.65+ | Test runner and API request context |
| Ajv + ajv-formats | JSON Schema validation |
| dotenv | Environment configuration |
| Custom logger / reporter | Observability and reporting |

## Project Structure

```
.
├── .github/workflows/api-tests.yml   CI pipeline
├── playwright.config.js              Playwright configuration
├── src
│   ├── api
│   │   ├── ApiClient.js              HTTP client with retries, logging, stats
│   │   └── ApiResponse.js            Response wrapper
│   ├── builders                      Test data builders (Product, User, Post, Cart)
│   ├── config/env.js                 Environment configuration
│   ├── constants/index.js            HTTP status and header constants
│   ├── fixtures/api.fixtures.js      Playwright fixtures and authentication
│   ├── reporters/SummaryReporter.js  Markdown and console summary reporter
│   ├── schemas                       JSON Schemas for contract validation
│   ├── services                      API service objects
│   ├── setup                         Global setup, teardown, health check
│   └── utils                         Assertions, logger, data generator, validator
├── tests
│   ├── auth/auth.spec.js             Authentication and security
│   ├── carts/carts.spec.js           Cart CRUD and totals
│   ├── contract/contract.spec.js     Contract, CORS, headers, SLA
│   ├── e2e/shopping-flow.spec.js     Multi-service business flows
│   ├── posts/posts.spec.js           Post CRUD and search
│   ├── products/products-crud.spec.js
│   ├── products/products-query.spec.js
│   └── users/users.spec.js
├── scripts/clean.js                  Cleanup utility
├── .env                              Local runtime configuration
├── .env.example                      Documented configuration template
└── package.json
```

## Quick Start

Requirements: Node.js 18 or newer and network access to `https://dummyjson.com`.

```bash
npm install
npm run health
npm test
```

No browser download is required because this framework only uses Playwright's API request context.

## Test Suites

| File | Tests | Coverage |
| --- | ---: | --- |
| `tests/auth/auth.spec.js` | 7 | Login, refresh, profile, missing/invalid token, validation |
| `tests/products/products-crud.spec.js` | 7 | List, read, create, update, patch, delete, 404 |
| `tests/products/products-query.spec.js` | 7 | Search, pagination, field selection, sorting, categories |
| `tests/users/users.spec.js` | 6 | List, read, search, nested filter, create, 404 |
| `tests/posts/posts.spec.js` | 8 | List, read, search, posts by user, CRUD |
| `tests/carts/carts.spec.js` | 6 | List, read, carts by user, create, replace, delete |
| `tests/contract/contract.spec.js` | 6 | Schema contracts, CORS, security headers, response SLA |
| `tests/e2e/shopping-flow.spec.js` | 2 | Authenticated catalog-to-cart flow, guest search flow |
| **Total** | **49** | |

## Commands

```bash
npm test                 # Run the full suite
npm run test:smoke       # Run tests tagged @smoke
npm run test:regression  # Run tests tagged @regression
npm run test:security    # Run tests tagged @security
npm run test:contract    # Run tests tagged @contract
npm run test:auth
npm run test:products
npm run test:users
npm run test:posts
npm run test:carts
npm run test:contract-suite
npm run test:e2e
npm run test:serial      # Single worker, useful for debugging
npm run test:ci          # Two workers, intended for CI
npm run health           # Standalone API health check
npm run report           # Open the HTML report
npm run clean            # Remove generated reports and logs
```

Tags can be combined with any Playwright CLI option:

```bash
npx playwright test --grep "@smoke|@security"
npx playwright test --grep @smoke --workers=1
npx playwright test tests/products --grep @regression
```

## Configuration

All configuration is read from environment variables and loaded from `.env` by `src/config/env.js`.

| Variable | Default | Description |
| --- | --- | --- |
| `TEST_ENV` | `qa` | Environment label used in reports and logs |
| `BASE_URL` | `https://dummyjson.com` | API base URL |
| `API_TIMEOUT_MS` | `30000` | Per-request timeout |
| `API_RETRIES` | `1` | Retry count for transient failures |
| `API_RETRY_DELAY_MS` | `750` | Base delay for exponential backoff |
| `API_MAX_REDIRECTS` | `5` | Maximum redirects per request |
| `LOG_LEVEL` | `info` | `error`, `warn`, `info` or `debug` |
| `LOG_TO_FILE` | `true` | Append logs to `logs/api-automation-YYYY-MM-DD.log` |
| `AUTH_USERNAME` | `emilys` | Demo account username |
| `AUTH_PASSWORD` | `emilyspass` | Demo account password |
| `HEALTH_CHECK_STRICT` | `true` | Fail the run if global health check fails |
| `WORKERS` | `2` | Playwright worker count |
| `CI` | unset | Enables CI retries and changes reporting defaults |

Copy `.env.example` to `.env` when provisioning a new environment.

## Architecture

### Request lifecycle

1. A test requests a fixture such as `productService`.
2. The fixture injects an `ApiClient` wrapping Playwright's `APIRequestContext`.
3. The service builds a domain-specific request and delegates to `ApiClient`.
4. `ApiClient` adds correlation IDs and default headers, logs the request with redacted secrets, and executes it.
5. Transient responses are retried with exponential backoff and `Retry-After` support.
6. `ApiResponse` parses JSON, captures status, headers, timing and request metadata.
7. Assertions validate status codes, headers, response time and JSON Schema contracts.
8. On failure, the API call history and client statistics are attached to the Playwright report.
9. The custom reporter writes `reports/summary.md` and prints a console summary.

### Authentication fixture

Authentication happens once per worker through the worker-scoped `authState` fixture. Tests then use:

- `authState.token`, `authState.refreshToken`, `authState.user`
- `authToken`
- `authenticatedClient` (an `ApiClient` preconfigured with the bearer token)

This avoids authenticating on every test while keeping tokens isolated per worker.

### Service layer

Services expose intention-revealing methods instead of raw URLs:

```js
const products = await productService.search('phone', { limit: 5 });
const cart = await cartService.add(
  new CartBuilder().withUserId(1).withProduct(1, 2).build(),
);
```

Adding a new endpoint means adding a method to the relevant service, not changing tests that use it.

## Writing a Test

```js
const { test, expect } = require('../../src/fixtures/api.fixtures');
const { HTTP_STATUS } = require('../../src/constants');
const { expectStatus, expectSchema } = require('../../src/utils/assertions');

test('@smoke returns a product by id', async ({ productService }) => {
  const response = await productService.getById(1);

  expectStatus(response, HTTP_STATUS.OK);
  expectSchema(response.data, 'product.schema.json', 'Product');
  expect(response.data.id).toBe(1);
});
```

## Contract Validation

Schemas live in `src/schemas` and are loaded by `src/utils/schema-validator.js`. Validate any payload with:

```js
const { validateSchema } = require('../../src/utils/schema-validator');

const result = validateSchema(response.data, 'cart.schema.json');
// result = { valid: boolean, errors: string[] }
```

Or use the Playwright-aware helper:

```js
const { expectSchema } = require('../../src/utils/assertions');
expectSchema(response.data, 'cart.schema.json', 'Cart response');
```

To add a contract, drop a new `*.schema.json` file into `src/schemas`. It is registered automatically on the next run. Give it a unique `$id` and reference it by filename or `$id`.

## Reports and Logs

| Artifact | Location |
| --- | --- |
| HTML report | `reports/html/index.html` |
| JSON results | `reports/results.json` |
| JUnit XML | `reports/junit.xml` |
| Markdown summary | `reports/summary.md` |
| Health check | `reports/health-check.json` |
| Environment metadata | `reports/environment.json` |
| Runtime logs | `logs/api-automation-YYYY-MM-DD.log` |
| Failure API traces | Attached inside the HTML report per test |

Open the HTML report with `npm run report`.

## CI

`.github/workflows/api-tests.yml` runs on pushes, pull requests and manual dispatch:

- Installs dependencies with `npm ci`
- Executes the health check
- Runs the full API suite with two workers
- Uploads reports and logs as artifacts
- Publishes `reports/summary.md` to the GitHub Actions step summary

## DummyJSON Behaviour

DummyJSON is a demo API. Write operations (`POST`, `PUT`, `PATCH`, `DELETE`) are simulated and do not persist across requests. The tests are written around this behaviour: they assert the immediate response contract, echoed fields and deletion markers rather than state that would require persistence. This keeps the suite deterministic and safe to run repeatedly.

## Troubleshooting

| Symptom | Resolution |
| --- | --- |
| `API health check failed` | Verify network access to `BASE_URL` or set `HEALTH_CHECK_STRICT=false` while diagnosing |
| HTTP 429 responses | Lower `WORKERS`, rerun later, or increase `API_RETRY_DELAY_MS`; the client retries 429 automatically |
| Authentication fixture failure | Confirm `AUTH_USERNAME` and `AUTH_PASSWORD` are valid for the target environment |
| Schema validation failure | Inspect the reported JSON path, update the affected schema or fix the API contract |
| No debug logs | Set `LOG_LEVEL=debug` in `.env` |
| Stale artifacts | Run `npm run clean` |

## Production Notes

- Secrets are redacted from logs and attached API traces.
- Global setup fails fast when the target API is unreachable.
- Retries are bounded and never applied to deterministic 4xx responses.
- Tests avoid shared mutable state and rely on worker-scoped authentication.
- Every response is validated against explicit contracts.
- Reports are generated in machine-readable formats suitable for CI gates and dashboards.

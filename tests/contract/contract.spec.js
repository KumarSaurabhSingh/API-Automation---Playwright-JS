const { test, expect } = require('../../src/fixtures/api.fixtures');
const env = require('../../src/config/env');
const { HTTP_STATUS, HEADERS } = require('../../src/constants');
const {
  expectStatus,
  expectSuccess,
  expectJson,
  expectSchema,
  expectHeader,
  expectResponseTime,
  expectErrorMessage,
} = require('../../src/utils/assertions');

test.describe('API contract and platform checks', () => {
  test('@smoke serves a healthy product resource within SLA', async ({ apiClient }) => {
    const response = await apiClient.get('/products/1');

    expectStatus(response, HTTP_STATUS.OK);
    expectJson(response);
    expectSchema(response.data, 'product.schema.json', 'Product');
    expectHeader(response, HEADERS.CONTENT_TYPE, /application\/json/);
    expectHeader(response, HEADERS.CONTENT_TYPE_OPTIONS, 'nosniff');
    expectHeader(response, HEADERS.RATE_LIMIT_LIMIT, /^\d+$/);
    expectResponseTime(response, 5000);
  });

  test('@contract exposes a stable login contract', async ({ authService }) => {
    const response = await authService.login(env.credentials);

    expectStatus(response, HTTP_STATUS.OK);
    expectSchema(response.data, 'auth-login.schema.json', 'Login contract');
  });

  test('@contract exposes a stable users collection contract', async ({ userService }) => {
    const response = await userService.getAll({ limit: 1 });

    expectStatus(response, HTTP_STATUS.OK);
    expectSchema(response.data, 'users-list.schema.json', 'Users collection contract');
  });

  test('@contract exposes a structured error contract for missing resources', async ({
    apiClient,
  }) => {
    const response = await apiClient.get('/products/987654321');

    expectStatus(response, HTTP_STATUS.NOT_FOUND);
    expectJson(response);
    const message = expectErrorMessage(response, /not found/i);
    expect(message).toEqual(expect.any(String));
  });

  test('@regression supports CORS preflight requests', async ({ apiClient }) => {
    const origin = 'https://automation.example.com';
    const response = await apiClient.options('/products/1', {
      headers: {
        Origin: origin,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'content-type',
      },
    });

    expectStatus(response, [HTTP_STATUS.OK, HTTP_STATUS.NO_CONTENT]);
    expectHeader(
      response,
      HEADERS.ACCESS_CONTROL_ALLOW_ORIGIN,
      (value) => value === origin || value === '*',
    );
    expectHeader(response, HEADERS.ACCESS_CONTROL_ALLOW_METHODS, /GET/);
  });

  test('@performance responds to a lightweight request within budget', async ({ apiClient }) => {
    const response = await apiClient.get('/products', {
      query: { limit: 1, select: 'id' },
    });

    expectStatus(response, HTTP_STATUS.OK);
    expectSuccess(response);
    expectResponseTime(response, 5000);
  });
});

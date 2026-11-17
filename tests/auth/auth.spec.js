const { test, expect } = require('../../src/fixtures/api.fixtures');
const env = require('../../src/config/env');
const { HTTP_STATUS, HEADERS } = require('../../src/constants');
const {
  expectStatus,
  expectSchema,
  expectErrorMessage,
  expectHeader,
} = require('../../src/utils/assertions');

test.describe('Authentication API', () => {
  test('@smoke logs in with valid credentials and returns JWT tokens', async ({ authService }) => {
    const response = await authService.login(env.credentials);

    expectStatus(response, HTTP_STATUS.OK);
    expectSchema(response.data, 'auth-login.schema.json', 'Login response');
    expectHeader(response, HEADERS.CONTENT_TYPE, /application\/json/);

    expect(response.data.accessToken).toMatch(/^eyJ/);
    expect(response.data.refreshToken).toMatch(/^eyJ/);
    expect(response.data.username).toBe(env.credentials.username);
    expect(response.data.id).toBeGreaterThan(0);
  });

  test('@regression rejects invalid credentials', async ({ authService }) => {
    const response = await authService.login({
      username: env.credentials.username,
      password: `invalid-${Date.now()}`,
    });

    expectStatus(response, HTTP_STATUS.BAD_REQUEST);
    expectErrorMessage(response, /invalid credentials/i);
  });

  test('@validation rejects a login request without a password', async ({ apiClient }) => {
    const response = await apiClient.post('/auth/login', {
      data: { username: env.credentials.username },
    });

    expectStatus(response, HTTP_STATUS.BAD_REQUEST);
    expectErrorMessage(response, /username and password required/i);
  });

  test('@smoke returns the authenticated user profile', async ({ authService, authState }) => {
    const response = await authService.me(authState.token);

    expectStatus(response, HTTP_STATUS.OK);
    expectSchema(response.data, 'user.schema.json', 'Profile response');
    expect(response.data.id).toBe(authState.user.id);
    expect(response.data.email).toBe(authState.user.email);
  });

  test('@security rejects /auth/me without a token', async ({ authService }) => {
    const response = await authService.me();

    expectStatus(response, HTTP_STATUS.UNAUTHORIZED);
    expectErrorMessage(response, /access token is required/i);
  });

  test('@security rejects /auth/me with a malformed token', async ({ authService }) => {
    const response = await authService.me('not-a-valid-jwt');

    expect(response.ok).toBeFalsy();
    expectStatus(response, [HTTP_STATUS.UNAUTHORIZED, HTTP_STATUS.INTERNAL_SERVER_ERROR]);
    expectErrorMessage(response, /token/i);
  });

  test('@regression refreshes an access token', async ({ authService, authState }) => {
    const response = await authService.refresh(authState.refreshToken);

    expectStatus(response, HTTP_STATUS.OK);
    expectSchema(response.data, 'auth-refresh.schema.json', 'Refresh response');
    expect(response.data.accessToken).toMatch(/^eyJ/);
    expect(response.data.refreshToken).toMatch(/^eyJ/);
  });
});

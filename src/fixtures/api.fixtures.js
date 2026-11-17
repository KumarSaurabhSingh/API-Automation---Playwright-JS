const base = require('@playwright/test');
const { ApiClient } = require('../api/ApiClient');
const AuthService = require('../services/AuthService');
const ProductService = require('../services/ProductService');
const UserService = require('../services/UserService');
const PostService = require('../services/PostService');
const CartService = require('../services/CartService');
const env = require('../config/env');
const { createLogger } = require('../utils/logger');

const fixtureLogger = createLogger('fixtures');

function clientOptions(logger) {
  return {
    baseUrl: env.baseUrl,
    timeout: env.timeout,
    retries: env.retries,
    retryDelayMs: env.retryDelayMs,
    maxRedirects: env.maxRedirects,
    logger,
  };
}

async function attachApiArtifacts(testInfo, client, label) {
  try {
    if (testInfo.status !== testInfo.expectedStatus) {
      await testInfo.attach(`${label}-api-calls.json`, {
        body: JSON.stringify(client.getHistory(), null, 2),
        contentType: 'application/json',
      });
    }

    await testInfo.attach(`${label}-api-stats.json`, {
      body: JSON.stringify(client.getStats(), null, 2),
      contentType: 'application/json',
    });
  } catch (error) {
    fixtureLogger.debug('Unable to attach API artifacts', { error: error.message });
  }
}

const test = base.test.extend({
  apiClient: async ({ request }, use, testInfo) => {
    const client = new ApiClient(
      request,
      clientOptions(createLogger(`api:${testInfo.titlePath.join(':')}`)),
    );

    await use(client);
    await attachApiArtifacts(testInfo, client, 'anonymous');
  },

  authState: [
    async ({}, use) => {
      const logger = fixtureLogger.child('auth-state');
      logger.info('Authenticating worker fixture user', { username: env.credentials.username });

      const context = await base.request.newContext({
        baseURL: env.baseUrl,
        timeout: env.timeout,
        ignoreHTTPSErrors: true,
        extraHTTPHeaders: {
          Accept: env.defaults.accept,
          'User-Agent': env.defaults.userAgent,
        },
      });

      const client = new ApiClient(context, {
        ...clientOptions(logger),
        retries: 0,
      });

      try {
        const response = await new AuthService(client).login(env.credentials);

        if (!response.ok || !response.data?.accessToken) {
          throw new Error(
            `Fixture authentication failed with HTTP ${response.status}: ${response.text}`,
          );
        }

        await use({
          token: response.data.accessToken,
          refreshToken: response.data.refreshToken,
          user: response.data,
        });
      } finally {
        await context.dispose();
      }
    },
    { scope: 'worker' },
  ],

  authToken: async ({ authState }, use) => {
    await use(authState.token);
  },

  authenticatedClient: async ({ request, authState }, use, testInfo) => {
    const client = new ApiClient(request, {
      ...clientOptions(createLogger(`auth-api:${testInfo.titlePath.join(':')}`)),
      headers: { Authorization: `Bearer ${authState.token}` },
    });

    await use(client);
    await attachApiArtifacts(testInfo, client, 'authenticated');
  },

  authService: async ({ apiClient }, use) => {
    await use(new AuthService(apiClient));
  },

  productService: async ({ apiClient }, use) => {
    await use(new ProductService(apiClient));
  },

  userService: async ({ apiClient }, use) => {
    await use(new UserService(apiClient));
  },

  postService: async ({ apiClient }, use) => {
    await use(new PostService(apiClient));
  },

  cartService: async ({ apiClient }, use) => {
    await use(new CartService(apiClient));
  },
});

module.exports = { test, expect: base.expect };

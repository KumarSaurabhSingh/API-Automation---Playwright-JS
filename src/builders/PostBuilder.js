const { randomString } = require('../utils/data-generator');

class PostBuilder {
  constructor() {
    this.reset();
  }

  reset() {
    this.payload = {
      title: `Automated Post ${randomString(6)}`,
      body: `This post was created by the API automation framework at ${new Date().toISOString()}.`,
      userId: 1,
      tags: ['automation', 'api', 'playwright'],
    };
    return this;
  }

  with(overrides) {
    this.payload = { ...this.payload, ...overrides };
    return this;
  }

  withTitle(title) {
    this.payload.title = title;
    return this;
  }

  withBody(body) {
    this.payload.body = body;
    return this;
  }

  withUserId(userId) {
    this.payload.userId = userId;
    return this;
  }

  withTags(tags) {
    this.payload.tags = tags;
    return this;
  }

  build() {
    return structuredClone(this.payload);
  }
}

module.exports = PostBuilder;

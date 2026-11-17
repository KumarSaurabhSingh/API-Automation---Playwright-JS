const { test, expect } = require('../../src/fixtures/api.fixtures');
const { HTTP_STATUS } = require('../../src/constants');
const PostBuilder = require('../../src/builders/PostBuilder');
const {
  expectStatus,
  expectSchema,
  expectMinLength,
} = require('../../src/utils/assertions');

test.describe('Posts API', () => {
  test('@smoke lists posts with pagination', async ({ postService }) => {
    const response = await postService.getAll({ limit: 5, skip: 0 });

    expectStatus(response, HTTP_STATUS.OK);
    expectSchema(response.data, 'posts-list.schema.json', 'Posts list');
    expect(response.data.posts).toHaveLength(5);
    expect(response.data.total).toBeGreaterThan(5);
  });

  test('@smoke returns a single post by id', async ({ postService }) => {
    const response = await postService.getById(1);

    expectStatus(response, HTTP_STATUS.OK);
    expectSchema(response.data, 'post.schema.json', 'Post');
    expect(response.data.id).toBe(1);
    expect(response.data.reactions.likes).toBeGreaterThanOrEqual(0);
  });

  test('@regression searches posts by keyword', async ({ postService }) => {
    const response = await postService.search('love', { limit: 5 });

    expectStatus(response, HTTP_STATUS.OK);
    expectSchema(response.data, 'posts-list.schema.json', 'Post search');
    expectMinLength(response.data.posts, 1, 'Post search results');
    expect(response.data.total).toBeGreaterThan(0);
  });

  test('@regression returns posts authored by a specific user', async ({ postService }) => {
    const userId = 1;
    const response = await postService.getByUser(userId, { limit: 5 });

    expectStatus(response, HTTP_STATUS.OK);
    expectSchema(response.data, 'posts-list.schema.json', 'Posts by user');
    expectMinLength(response.data.posts, 1, 'Posts by user');

    for (const post of response.data.posts) {
      expect(post.userId).toBe(userId);
    }
  });

  test('@smoke creates a post', async ({ postService }) => {
    const payload = new PostBuilder()
      .withTitle(`Automation Post ${Date.now()}`)
      .withBody('Created through the production-grade API automation framework.')
      .withUserId(1)
      .withTags(['automation', 'api'])
      .build();

    const response = await postService.add(payload);

    expectStatus(response, HTTP_STATUS.CREATED);
    expect(response.data.id).toEqual(expect.any(Number));
    expect(response.data).toMatchObject({
      title: payload.title,
      body: payload.body,
      userId: payload.userId,
      tags: payload.tags,
    });
  });

  test('@regression updates a post with PUT', async ({ postService }) => {
    const response = await postService.update(1, {
      title: 'Updated post title',
      body: 'Updated post body',
    });

    expectStatus(response, HTTP_STATUS.OK);
    expect(response.data.id).toBe(1);
    expect(response.data.title).toBe('Updated post title');
    expect(response.data.body).toBe('Updated post body');
  });

  test('@regression partially updates a post with PATCH', async ({ postService }) => {
    const response = await postService.partialUpdate(1, { title: 'Patched post title' });

    expectStatus(response, HTTP_STATUS.OK);
    expect(response.data.id).toBe(1);
    expect(response.data.title).toBe('Patched post title');
  });

  test('@regression deletes a post', async ({ postService }) => {
    const response = await postService.remove(1);

    expectStatus(response, HTTP_STATUS.OK);
    expect(response.data.id).toBe(1);
    expect(response.data.isDeleted).toBe(true);
    expect(response.data.deletedOn).toBeTruthy();
  });
});

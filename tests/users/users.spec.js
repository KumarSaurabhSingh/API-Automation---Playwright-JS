const { test, expect } = require('../../src/fixtures/api.fixtures');
const { HTTP_STATUS } = require('../../src/constants');
const UserBuilder = require('../../src/builders/UserBuilder');
const {
  expectStatus,
  expectSchema,
  expectErrorMessage,
  expectMinLength,
} = require('../../src/utils/assertions');

test.describe('Users API', () => {
  test('@smoke lists users with pagination', async ({ userService }) => {
    const response = await userService.getAll({ limit: 5, skip: 0 });

    expectStatus(response, HTTP_STATUS.OK);
    expectSchema(response.data, 'users-list.schema.json', 'Users list');
    expect(response.data.users).toHaveLength(5);
    expect(response.data.limit).toBe(5);
    expect(response.data.total).toBeGreaterThan(5);
  });

  test('@smoke returns a single user by id', async ({ userService }) => {
    const response = await userService.getById(1);

    expectStatus(response, HTTP_STATUS.OK);
    expectSchema(response.data, 'user.schema.json', 'User');
    expect(response.data.id).toBe(1);
    expect(response.data.email).toMatch(/@/);
  });

  test('@regression returns 404 for an unknown user', async ({ userService }) => {
    const unknownId = 9876543;
    const response = await userService.getById(unknownId);

    expectStatus(response, HTTP_STATUS.NOT_FOUND);
    expectErrorMessage(response, String(unknownId));
  });

  test('@regression searches users by name', async ({ userService }) => {
    const response = await userService.search('Emily', { limit: 5 });

    expectStatus(response, HTTP_STATUS.OK);
    expectSchema(response.data, 'users-list.schema.json', 'User search');
    expectMinLength(response.data.users, 1, 'User search results');
    expect(response.data.total).toBeGreaterThan(0);

    const containsEmily = response.data.users.some((user) =>
      `${user.firstName} ${user.lastName} ${user.username} ${user.email}`
        .toLowerCase()
        .includes('emily'),
    );
    expect(containsEmily, 'Search results should be relevant to the query').toBeTruthy();
  });

  test('@regression filters users by a nested key/value pair', async ({ userService }) => {
    const response = await userService.filter('hair.color', 'Brown', { limit: 5 });

    expectStatus(response, HTTP_STATUS.OK);
    expectSchema(response.data, 'users-list.schema.json', 'Filtered users');
    expectMinLength(response.data.users, 1, 'Filtered users');

    for (const user of response.data.users) {
      expect(user.hair.color).toBe('Brown');
    }
  });

  test('@regression creates a user', async ({ userService }) => {
    const payload = new UserBuilder().withFirstName('Automation').build();

    const response = await userService.add(payload);

    expectStatus(response, HTTP_STATUS.CREATED);
    expect(response.data.id).toEqual(expect.any(Number));
    expect(response.data).toMatchObject({
      firstName: payload.firstName,
      lastName: payload.lastName,
      age: payload.age,
      email: payload.email,
      username: payload.username,
    });
  });
});

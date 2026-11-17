const { test, expect } = require('../../src/fixtures/api.fixtures');
const { HTTP_STATUS } = require('../../src/constants');
const CartBuilder = require('../../src/builders/CartBuilder');
const {
  expectStatus,
  expectSchema,
  expectMinLength,
} = require('../../src/utils/assertions');

test.describe('Carts API', () => {
  test('@smoke lists carts with pagination', async ({ cartService }) => {
    const response = await cartService.getAll({ limit: 5, skip: 0 });

    expectStatus(response, HTTP_STATUS.OK);
    expectSchema(response.data, 'carts-list.schema.json', 'Carts list');
    expect(response.data.carts).toHaveLength(5);
    expect(response.data.total).toBeGreaterThan(5);
  });

  test('@smoke returns a cart with consistent totals', async ({ cartService }) => {
    const response = await cartService.getById(1);

    expectStatus(response, HTTP_STATUS.OK);
    expectSchema(response.data, 'cart.schema.json', 'Cart');
    expect(response.data.id).toBe(1);
    expect(response.data.totalProducts).toBe(response.data.products.length);
    expect(response.data.totalQuantity).toBe(
      response.data.products.reduce((sum, product) => sum + product.quantity, 0),
    );
    expect(response.data.total).toBeCloseTo(
      response.data.products.reduce((sum, product) => sum + product.total, 0),
      2,
    );
  });

  test('@regression returns carts for a specific user', async ({ cartService }) => {
    const userId = 1;
    const response = await cartService.getByUser(userId, { limit: 5 });

    expectStatus(response, HTTP_STATUS.OK);
    expectSchema(response.data, 'carts-list.schema.json', 'Carts by user');
    expectMinLength(response.data.carts, 1, 'Carts by user');

    for (const cart of response.data.carts) {
      expect(cart.userId).toBe(userId);
    }
  });

  test('@smoke creates a cart with products', async ({ cartService }) => {
    const payload = new CartBuilder()
      .withUserId(1)
      .withProduct(1, 2)
      .withProduct(2, 1)
      .build();

    const response = await cartService.add(payload);

    expectStatus(response, HTTP_STATUS.CREATED);
    expectSchema(response.data, 'cart.schema.json', 'Created cart');
    expect(response.data.userId).toBe(1);
    expect(response.data.products).toHaveLength(2);
    expect(response.data.totalQuantity).toBe(3);
    expect(response.data.total).toBeCloseTo(
      response.data.products.reduce((sum, product) => sum + product.total, 0),
      2,
    );

    for (const product of response.data.products) {
      expect(product.total).toBeCloseTo(product.price * product.quantity, 2);
    }
  });

  test('@regression replaces the contents of a cart', async ({ cartService }) => {
    const response = await cartService.update(1, {
      products: [{ id: 2, quantity: 3 }],
    });

    expectStatus(response, HTTP_STATUS.OK);
    expectSchema(response.data, 'cart.schema.json', 'Updated cart');
    expect(response.data.id).toBe(1);
    expect(response.data.products).toHaveLength(1);
    expect(response.data.products[0].id).toBe(2);
    expect(response.data.products[0].quantity).toBe(3);
    expect(response.data.totalQuantity).toBe(3);
    expect(response.data.total).toBeCloseTo(
      response.data.products[0].price * 3,
      2,
    );
  });

  test('@regression deletes a cart', async ({ cartService }) => {
    const response = await cartService.remove(1);

    expectStatus(response, HTTP_STATUS.OK);
    expect(response.data.id).toBe(1);
    expect(response.data.isDeleted).toBe(true);
    expect(response.data.deletedOn).toBeTruthy();
  });
});

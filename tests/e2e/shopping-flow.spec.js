const { test, expect } = require('../../src/fixtures/api.fixtures');
const { HTTP_STATUS } = require('../../src/constants');
const AuthService = require('../../src/services/AuthService');
const ProductService = require('../../src/services/ProductService');
const CartService = require('../../src/services/CartService');
const CartBuilder = require('../../src/builders/CartBuilder');
const {
  expectStatus,
  expectSchema,
  expectMinLength,
} = require('../../src/utils/assertions');

test.describe('End-to-end shopping flows', () => {
  test('@smoke authenticated customer browses the catalog and creates a cart', async ({
    authenticatedClient,
    authState,
  }) => {
    const authService = new AuthService(authenticatedClient);
    const productService = new ProductService(authenticatedClient);
    const cartService = new CartService(authenticatedClient);

    const profile = await authService.me();
    expectStatus(profile, HTTP_STATUS.OK);
    expect(profile.data.id).toBe(authState.user.id);

    const catalog = await productService.getAll({ limit: 3 });
    expectStatus(catalog, HTTP_STATUS.OK);
    expectSchema(catalog.data, 'products-list.schema.json', 'Catalog');
    expectMinLength(catalog.data.products, 1, 'Catalog products');

    const selectedProduct = catalog.data.products[0];

    const cart = await cartService.add(
      new CartBuilder()
        .withUserId(authState.user.id)
        .withProduct(selectedProduct.id, 2)
        .build(),
    );

    expectStatus(cart, HTTP_STATUS.CREATED);
    expectSchema(cart.data, 'cart.schema.json', 'Cart');
    expect(cart.data.userId).toBe(authState.user.id);
    expect(cart.data.products).toHaveLength(1);
    expect(cart.data.products[0].id).toBe(selectedProduct.id);
    expect(cart.data.products[0].quantity).toBe(2);
    expect(cart.data.products[0].total).toBeCloseTo(selectedProduct.price * 2, 2);
    expect(cart.data.total).toBeCloseTo(selectedProduct.price * 2, 2);
    expect(cart.data.totalQuantity).toBe(2);
  });

  test('@regression guest searches for a product and opens its details', async ({
    productService,
  }) => {
    const search = await productService.search('phone', { limit: 5 });
    expectStatus(search, HTTP_STATUS.OK);
    expectSchema(search.data, 'products-list.schema.json', 'Search results');
    expectMinLength(search.data.products, 1, 'Search results');

    const match = search.data.products[0];
    const detail = await productService.getById(match.id);

    expectStatus(detail, HTTP_STATUS.OK);
    expectSchema(detail.data, 'product.schema.json', 'Product detail');
    expect(detail.data.id).toBe(match.id);
    expect(detail.data.title).toBe(match.title);
    expect(detail.data.price).toBeGreaterThan(0);
  });
});

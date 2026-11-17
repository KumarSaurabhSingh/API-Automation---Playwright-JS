const { test, expect } = require('../../src/fixtures/api.fixtures');
const { HTTP_STATUS } = require('../../src/constants');
const ProductBuilder = require('../../src/builders/ProductBuilder');
const {
  expectStatus,
  expectSchema,
  expectErrorMessage,
} = require('../../src/utils/assertions');

test.describe('Products CRUD API', () => {
  test('@smoke lists products with pagination metadata', async ({ productService }) => {
    const response = await productService.getAll({ limit: 5, skip: 0 });

    expectStatus(response, HTTP_STATUS.OK);
    expectSchema(response.data, 'products-list.schema.json', 'Products list');
    expect(response.data.products).toHaveLength(5);
    expect(response.data.limit).toBe(5);
    expect(response.data.skip).toBe(0);
    expect(response.data.total).toBeGreaterThan(5);
  });

  test('@smoke returns a single product by id', async ({ productService }) => {
    const response = await productService.getById(1);

    expectStatus(response, HTTP_STATUS.OK);
    expectSchema(response.data, 'product.schema.json', 'Product');
    expect(response.data.id).toBe(1);
    expect(response.data.images.length).toBeGreaterThan(0);
  });

  test('@regression returns 404 for an unknown product', async ({ productService }) => {
    const unknownId = 9999999;
    const response = await productService.getById(unknownId);

    expectStatus(response, HTTP_STATUS.NOT_FOUND);
    expectErrorMessage(response, String(unknownId));
  });

  test('@smoke creates a product', async ({ productService }) => {
    const payload = new ProductBuilder()
      .withTitle(`API Automation Product ${Date.now()}`)
      .withPrice(49.99)
      .withStock(25)
      .withCategory('beauty')
      .build();

    const response = await productService.add(payload);

    expectStatus(response, HTTP_STATUS.CREATED);
    expect(response.data.id).toEqual(expect.any(Number));
    expect(response.data).toMatchObject({
      title: payload.title,
      price: payload.price,
      stock: payload.stock,
      category: payload.category,
      brand: payload.brand,
    });
  });

  test('@regression updates a product with PUT', async ({ productService }) => {
    const response = await productService.update(1, {
      title: 'Updated by API automation',
      price: 123.45,
    });

    expectStatus(response, HTTP_STATUS.OK);
    expect(response.data.id).toBe(1);
    expect(response.data.title).toBe('Updated by API automation');
    expect(response.data.price).toBe(123.45);
  });

  test('@regression partially updates a product with PATCH', async ({ productService }) => {
    const response = await productService.partialUpdate(1, { stock: 77 });

    expectStatus(response, HTTP_STATUS.OK);
    expect(response.data.id).toBe(1);
    expect(response.data.stock).toBe(77);
  });

  test('@regression deletes a product', async ({ productService }) => {
    const response = await productService.remove(1);

    expectStatus(response, HTTP_STATUS.OK);
    expect(response.data.id).toBe(1);
    expect(response.data.isDeleted).toBe(true);
    expect(response.data.deletedOn).toBeTruthy();
  });
});

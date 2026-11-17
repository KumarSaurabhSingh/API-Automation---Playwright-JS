const { test, expect } = require('../../src/fixtures/api.fixtures');
const { HTTP_STATUS } = require('../../src/constants');
const {
  expectStatus,
  expectSchema,
  expectMinLength,
} = require('../../src/utils/assertions');

test.describe('Products search, filtering and pagination', () => {
  test('@smoke searches products by keyword', async ({ productService }) => {
    const response = await productService.search('phone', { limit: 10 });

    expectStatus(response, HTTP_STATUS.OK);
    expectSchema(response.data, 'products-list.schema.json', 'Product search');
    expectMinLength(response.data.products, 1, 'Search results');
    expect(response.data.total).toBeGreaterThan(0);
  });

  test('@regression applies limit and skip pagination without overlaps', async ({
    productService,
  }) => {
    const firstPage = await productService.getAll({ limit: 5, skip: 0 });
    const secondPage = await productService.getAll({ limit: 5, skip: 5 });

    expectStatus(firstPage, HTTP_STATUS.OK);
    expectStatus(secondPage, HTTP_STATUS.OK);
    expect(firstPage.data.products).toHaveLength(5);
    expect(secondPage.data.products).toHaveLength(5);

    const firstIds = new Set(firstPage.data.products.map((product) => product.id));
    const secondIds = secondPage.data.products.map((product) => product.id);

    for (const id of secondIds) {
      expect(firstIds.has(id), `Product ${id} appeared on both pages`).toBeFalsy();
    }
  });

  test('@regression projects only selected fields', async ({ productService }) => {
    const response = await productService.getAll({
      limit: 3,
      select: 'title,price',
    });

    expectStatus(response, HTTP_STATUS.OK);
    expect(response.data.products).toHaveLength(3);

    for (const product of response.data.products) {
      expect(product).toHaveProperty('title');
      expect(product).toHaveProperty('price');
      expect(product.description).toBeUndefined();
      expect(product.images).toBeUndefined();
    }
  });

  test('@regression sorts products by price ascending', async ({ productService }) => {
    const response = await productService.getAll({
      limit: 10,
      sortBy: 'price',
      order: 'asc',
      select: 'price',
    });

    expectStatus(response, HTTP_STATUS.OK);
    const prices = response.data.products.map((product) => product.price);
    expectMinLength(prices, 2, 'Sorted prices');

    for (let index = 1; index < prices.length; index += 1) {
      expect(
        prices[index],
        `Price at index ${index} is lower than the previous price`,
      ).toBeGreaterThanOrEqual(prices[index - 1]);
    }
  });

  test('@smoke returns the list of product categories', async ({ productService }) => {
    const response = await productService.getCategories();

    expectStatus(response, HTTP_STATUS.OK);
    expectSchema(response.data, 'categories.schema.json', 'Categories');
    expectMinLength(response.data, 1, 'Categories');

    const slugs = response.data.map((category) => category.slug);
    expect(slugs).toContain('smartphones');
    expect(slugs).toContain('beauty');
  });

  test('@regression returns products for a known category', async ({ productService }) => {
    const response = await productService.getByCategory('smartphones', { limit: 5 });

    expectStatus(response, HTTP_STATUS.OK);
    expectSchema(response.data, 'products-list.schema.json', 'Category products');
    expectMinLength(response.data.products, 1, 'Category products');

    for (const product of response.data.products) {
      expect(product.category).toBe('smartphones');
    }
  });

  test('@regression returns an empty list for an unknown category', async ({
    productService,
  }) => {
    const response = await productService.getByCategory('category-that-does-not-exist');

    expectStatus(response, HTTP_STATUS.OK);
    expect(response.data.products).toEqual([]);
    expect(response.data.total).toBe(0);
  });
});

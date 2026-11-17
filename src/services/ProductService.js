const BaseService = require('./BaseService');

class ProductService extends BaseService {
  getAll(query = {}, options = {}) {
    return this.get('/products', { ...options, query });
  }

  getById(id, query = {}, options = {}) {
    return this.get(`/products/${this.encodeId(id)}`, { ...options, query });
  }

  search(term, query = {}, options = {}) {
    if (typeof term !== 'string' || term.trim() === '') {
      throw new TypeError('ProductService.search requires a non-empty search term');
    }

    return this.get('/products/search', {
      ...options,
      query: { ...query, q: term },
    });
  }

  getCategories(options = {}) {
    return this.get('/products/categories', options);
  }

  getCategoryList(options = {}) {
    return this.get('/products/category-list', options);
  }

  getByCategory(category, query = {}, options = {}) {
    if (typeof category !== 'string' || category.trim() === '') {
      throw new TypeError('ProductService.getByCategory requires a non-empty category');
    }

    return this.get(`/products/category/${encodeURIComponent(category)}`, {
      ...options,
      query,
    });
  }

  add(payload, options = {}) {
    if (!payload || typeof payload !== 'object') {
      throw new TypeError('ProductService.add requires a payload object');
    }

    return this.post('/products/add', { ...options, data: payload });
  }

  update(id, payload, options = {}) {
    return this.put(`/products/${this.encodeId(id)}`, {
      ...options,
      data: payload,
    });
  }

  partialUpdate(id, payload, options = {}) {
    return this.client.patch(`/products/${this.encodeId(id)}`, {
      ...options,
      data: payload,
    });
  }

  remove(id, options = {}) {
    return this.delete(`/products/${this.encodeId(id)}`, options);
  }
}

module.exports = ProductService;

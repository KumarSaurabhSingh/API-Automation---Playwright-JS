const BaseService = require('./BaseService');

class CartService extends BaseService {
  getAll(query = {}, options = {}) {
    return this.get('/carts', { ...options, query });
  }

  getById(id, query = {}, options = {}) {
    return this.get(`/carts/${this.encodeId(id)}`, { ...options, query });
  }

  getByUser(userId, query = {}, options = {}) {
    return this.get(`/carts/user/${this.encodeId(userId, 'userId')}`, {
      ...options,
      query,
    });
  }

  add(payload, options = {}) {
    if (!payload || !Array.isArray(payload.products) || payload.products.length === 0) {
      throw new TypeError('CartService.add requires a payload with a non-empty "products" array');
    }

    return this.post('/carts/add', { ...options, data: payload });
  }

  update(id, payload, options = {}) {
    return this.put(`/carts/${this.encodeId(id)}`, {
      ...options,
      data: payload,
    });
  }

  remove(id, options = {}) {
    return this.delete(`/carts/${this.encodeId(id)}`, options);
  }
}

module.exports = CartService;

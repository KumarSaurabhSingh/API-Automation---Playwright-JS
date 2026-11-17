const BaseService = require('./BaseService');

class UserService extends BaseService {
  getAll(query = {}, options = {}) {
    return this.get('/users', { ...options, query });
  }

  getById(id, query = {}, options = {}) {
    return this.get(`/users/${this.encodeId(id)}`, { ...options, query });
  }

  search(term, query = {}, options = {}) {
    if (typeof term !== 'string' || term.trim() === '') {
      throw new TypeError('UserService.search requires a non-empty search term');
    }

    return this.get('/users/search', {
      ...options,
      query: { ...query, q: term },
    });
  }

  filter(key, value, query = {}, options = {}) {
    if (typeof key !== 'string' || key.trim() === '') {
      throw new TypeError('UserService.filter requires a non-empty key');
    }
    if (value === undefined || value === null) {
      throw new TypeError('UserService.filter requires a value');
    }

    return this.get('/users/filter', {
      ...options,
      query: { ...query, key, value },
    });
  }

  add(payload, options = {}) {
    if (!payload || typeof payload !== 'object') {
      throw new TypeError('UserService.add requires a payload object');
    }

    return this.post('/users/add', { ...options, data: payload });
  }

  update(id, payload, options = {}) {
    return this.put(`/users/${this.encodeId(id)}`, {
      ...options,
      data: payload,
    });
  }

  remove(id, options = {}) {
    return this.delete(`/users/${this.encodeId(id)}`, options);
  }
}

module.exports = UserService;

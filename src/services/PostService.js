const BaseService = require('./BaseService');

class PostService extends BaseService {
  getAll(query = {}, options = {}) {
    return this.get('/posts', { ...options, query });
  }

  getById(id, query = {}, options = {}) {
    return this.get(`/posts/${this.encodeId(id)}`, { ...options, query });
  }

  search(term, query = {}, options = {}) {
    if (typeof term !== 'string' || term.trim() === '') {
      throw new TypeError('PostService.search requires a non-empty search term');
    }

    return this.get('/posts/search', {
      ...options,
      query: { ...query, q: term },
    });
  }

  getByUser(userId, query = {}, options = {}) {
    return this.get(`/posts/user/${this.encodeId(userId, 'userId')}`, {
      ...options,
      query,
    });
  }

  getByTag(tag, query = {}, options = {}) {
    if (typeof tag !== 'string' || tag.trim() === '') {
      throw new TypeError('PostService.getByTag requires a non-empty tag');
    }

    return this.get(`/posts/tag/${encodeURIComponent(tag)}`, {
      ...options,
      query,
    });
  }

  add(payload, options = {}) {
    if (!payload || typeof payload !== 'object') {
      throw new TypeError('PostService.add requires a payload object');
    }

    return this.post('/posts/add', { ...options, data: payload });
  }

  update(id, payload, options = {}) {
    return this.put(`/posts/${this.encodeId(id)}`, {
      ...options,
      data: payload,
    });
  }

  partialUpdate(id, payload, options = {}) {
    return this.client.patch(`/posts/${this.encodeId(id)}`, {
      ...options,
      data: payload,
    });
  }

  remove(id, options = {}) {
    return this.delete(`/posts/${this.encodeId(id)}`, options);
  }
}

module.exports = PostService;

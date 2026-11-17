class BaseService {
  constructor(client) {
    if (!client || typeof client.request !== 'function') {
      throw new TypeError(`${this.constructor.name} requires an ApiClient instance`);
    }
    this.client = client;
  }

  encodeId(id, label = 'id') {
    const isValid =
      (typeof id === 'number' && Number.isFinite(id)) ||
      (typeof id === 'string' && id.trim() !== '');

    if (!isValid) {
      throw new TypeError(`${this.constructor.name}: "${label}" must be a finite number or a non-empty string`);
    }

    return encodeURIComponent(String(id));
  }

  get(path, options) {
    return this.client.get(path, options);
  }

  post(path, options) {
    return this.client.post(path, options);
  }

  put(path, options) {
    return this.client.put(path, options);
  }

  patch(path, options) {
    return this.client.patch(path, options);
  }

  delete(path, options) {
    return this.client.delete(path, options);
  }
}

module.exports = BaseService;

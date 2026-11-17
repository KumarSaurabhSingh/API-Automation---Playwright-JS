function normalizeHeaders(headers = {}) {
  const normalized = {};
  for (const [key, value] of Object.entries(headers)) {
    normalized[key.toLowerCase()] = value;
  }
  return normalized;
}

class ApiResponse {
  constructor({
    status,
    statusText = '',
    headers = {},
    url = '',
    text = '',
    data,
    duration = 0,
    requestId,
    request = {},
    raw,
  }) {
    this.status = status;
    this.statusText = statusText;
    this.headers = normalizeHeaders(headers);
    this.url = url;
    this.text = text;
    this.data = data;
    this.duration = duration;
    this.requestId = requestId;
    this.request = request;
    this.raw = raw;
  }

  get ok() {
    return this.status >= 200 && this.status < 300;
  }

  get isJson() {
    return this.data !== undefined;
  }

  get contentType() {
    return this.header('content-type') || '';
  }

  get size() {
    return Buffer.byteLength(this.text || '', 'utf8');
  }

  header(name) {
    return this.headers[String(name).toLowerCase()];
  }

  get bodyPreview() {
    const limit = 1000;
    if (!this.text) return '';
    return this.text.length > limit ? `${this.text.slice(0, limit)}... [truncated]` : this.text;
  }

  toJSON() {
    return {
      status: this.status,
      statusText: this.statusText,
      url: this.url,
      durationMs: Math.round(this.duration),
      request: this.request,
      body: this.data !== undefined ? this.data : this.bodyPreview,
    };
  }

  static async fromPlaywright(raw, meta = {}) {
    let text = '';
    try {
      text = await raw.text();
    } catch {
      text = '';
    }

    let data;
    if (text && text.trim() !== '') {
      try {
        data = JSON.parse(text);
      } catch {
        data = undefined;
      }
    }

    return new ApiResponse({
      status: raw.status(),
      statusText: raw.statusText(),
      headers: raw.headers(),
      url: raw.url() || meta.url,
      text,
      data,
      duration: meta.duration ?? 0,
      requestId: meta.requestId,
      request: meta.request ?? {},
      raw,
    });
  }
}

module.exports = { ApiResponse, normalizeHeaders };

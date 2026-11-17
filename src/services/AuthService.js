const BaseService = require('./BaseService');

class AuthService extends BaseService {
  login(credentials, options = {}) {
    if (!credentials || !credentials.username || !credentials.password) {
      throw new TypeError('AuthService.login requires both "username" and "password"');
    }

    return this.post('/auth/login', { ...options, data: credentials });
  }

  me(token, options = {}) {
    const requestOptions = { ...options };
    if (token) requestOptions.authToken = token;
    return this.get('/auth/me', requestOptions);
  }

  refresh(refreshToken, options = {}) {
    if (typeof refreshToken !== 'string' || refreshToken.trim() === '') {
      throw new TypeError('AuthService.refresh requires a non-empty "refreshToken"');
    }

    return this.post('/auth/refresh', {
      ...options,
      data: { refreshToken },
    });
  }
}

module.exports = AuthService;

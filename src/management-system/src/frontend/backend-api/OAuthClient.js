import api from './ms-api-interface/oauth.js';

/**
 * @class
 *
 * Exposes an OAuth 2.0 client for backend communication
 *
 */
class OAuthClient {
  constructor() {}

  // redirects browser to login url
  async login() {
    window.location.href = `/login?redirectUri=${window.location.origin}`;
  }

  // redirects browser to register url
  async register() {
    window.location.href = '/register';
  }

  // redirects browser to logout url
  async logout() {
    window.location.href = '/logout';
  }

  /**
   * executed on every page load
   * performs oauth callback when oauth authorization request is detected based at backend
   *
   * @returns {Object} - authenticated or unauthenticated user information
   */
  async handleCallback() {
    const response = await api.handleOauthCallback();
    return response;
  }

  /**
   * calls userinfo endpoint at idp via backend to retreive user information
   *
   * @returns {Object} - userinfo object
   */
  async getUserInformation() {
    const userinfo = await api.getUserInfo();
    return userinfo;
  }
}

export default OAuthClient;

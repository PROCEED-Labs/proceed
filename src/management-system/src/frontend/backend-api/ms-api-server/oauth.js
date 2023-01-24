import restRequest from '@/frontend/backend-api/ms-api-interface/rest.js';
import { setXCsrfToken } from '@/frontend/backend-api/ms-api-interface/rest.js';
import { setIsAuthenticated, setUserId, setIsAuthRequired } from '@/frontend/backend-api/index.js';
import { connect } from '@/frontend/backend-api/ms-api-server/socket.js';

/**
 * executed on every page load
 * performs oauth callback when oauth authorization request is detected based at backend
 *
 * @returns {Object} - authenticated or unauthenticated user information
 */
async function handleOauthCallback() {
  try {
    const response = await fetch('/callback', {
      method: 'POST',
      cache: 'no-cache',
      credentials: process.env.NODE_ENV === 'production' ? 'same-origin' : 'include',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf': 1,
      },
      body: JSON.stringify({
        url: window.location.href,
      }),
    });

    const { isLoggedIn, config, user, permissions, handled, csrfToken } = await response.json();

    if (csrfToken) setXCsrfToken(csrfToken);
    if (isLoggedIn) setIsAuthenticated(isLoggedIn);
    if (user && user.sub) setUserId(user.sub);
    if (config && config.useAuthorization) setIsAuthRequired(config.useAuthorization);

    await connect();

    if (handled) {
      history.replaceState({}, document.title, '/#/process');
    }

    return { isLoggedIn, config, user, permissions, handled, csrfToken };
  } catch (e) {
    return {
      isLoggedIn: false,
      config: {},
      user: {},
      permissions: {},
      handled: false,
      csrfToken: '',
    };
  }
}

/**
 * calls userinfo endpoint at idp via backend to retreive user information
 *
 * @returns {Object} - userinfo object
 */
async function getUserInfo() {
  const userinfo = await restRequest(`/userinfo`);
  return userinfo;
}

export default { handleOauthCallback, getUserInfo };

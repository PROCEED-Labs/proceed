import url from 'url';
import jwt from 'jsonwebtoken';
import { generators } from 'openid-client';
import { verifyIdToken } from '../../utils/validations.js';
import { sortSpaceDelimitedString, getUrlParts } from '../../utils/utils.js';
import { buildPermissions } from '../../utils/permissions.js';
import logger from '../../../../shared-electron-server/logging.js';
import { encrypt, decrypt } from '../../utils/crypto.js';

/**
 * builds authorization url for authorization code flow with pkce
 *
 * @param {Object} req - express request object
 * @param {Object} res - express request object
 * @param {Object} client - OpenID Client
 * @param {Object} config - iam configuration
 * @param {Object} register - returns registration url if enabled (optional)
 * @returns {String} - authorization url
 */
export const login = async (req, res, client, config, register = false) => {
  const { redirectUri } = req.query; // maybe cache for callback to redirect to specific path?

  const usePKCE = config.response_type.includes('code');
  if (usePKCE) {
    req.session.code_verifier = generators.codeVerifier();
    req.session.code_challenge = generators.codeChallenge(req.session.code_verifier);
  }
  req.session.nonce = generators.nonce();
  req.session.state = generators.state();

  if (!/\bopenid\b/.test(config.scope)) {
    throw new Error("scope doesn't include required parameter openid");
  }

  const issuerRespTypes = Array.isArray(client.issuer.response_types_supported)
    ? client.issuer.response_types_supported
    : [];
  if (!issuerRespTypes.map(sortSpaceDelimitedString).includes(config.response_type)) {
    throw new Error('Response type is not supported by idp.');
  }

  const authUrlConfig = {
    scope: config.scope,
    nonce: req.session.nonce,
    state: req.session.state,
    redirect_uri: redirectUri || req.headers.referer,
    response_type: config.response_type,
  };

  if (usePKCE) {
    authUrlConfig.code_challenge = req.session.code_challenge;
    authUrlConfig.code_challenge_method = 'S256';
  }

  try {
    if (client.issuer.pushed_authorization_request_endpoint) {
      // implementation of pushed authorization request (par) if par endpoint available https://tools.ietf.org/id/draft-lodderstedt-oauth-par-00.html
      const parData = await client.pushedAuthorizationRequest(authUrlConfig);
      const authorizationUrl =
        client.issuer.authorization_endpoint +
        '?client_id=' +
        encodeURIComponent(client.client_id) +
        '&request_uri=' +
        encodeURIComponent(parData.request_uri);
      return register
        ? res.redirect(
            authorizationUrl.replace('/openid-connect/auth', '/openid-connect/registrations'),
          )
        : res.redirect(authorizationUrl);
    } else if (url.parse(client.issuer.issuer).hostname.match('\\.auth0\\.com$')) {
      // normal authorization code flow url for auth0
      const authorizationUrl = await client.authorizationUrl(authUrlConfig);
      return register
        ? res.redirect(`${authorizationUrl}&screen_hint=signup`)
        : res.redirect(authorizationUrl);
    } else {
      // normal authorization code flow url
      const authorizationUrl = await client.authorizationUrl(authUrlConfig);
      return register
        ? res.redirect(
            authorizationUrl.replace('/openid-connect/auth', '/openid-connect/registrations'),
          )
        : res.redirect(authorizationUrl);
    }
  } catch (e) {
    logger.error(e.toString());
    return res.redirect(req.headers.referer);
  }
};

/**
 * handles oauth callback, exchanges authorization code for tokens and caches tokens
 *
 * @param {Object} req - express request object
 * @param {Object} res - express request object
 * @param {Object} client - OpenID Client
 * @param {Object} config - iam configuration
 * @returns {Object} authenticated - authentication status
 */
export const handleOauthCallback = async (req, res, client, config) => {
  const urlData = getUrlParts(req.body.url);

  let isLoggedIn;
  let idToken;
  let csrfToken;

  if (urlData.state && urlData.code) {
    const { nonce, state } = req.session;

    const params = await client.callbackParams(req.body.url);

    const code_verifier =
      req.session && req.session.code_verifier ? req.session.code_verifier : null;

    const checks = {
      code_verifier,
      nonce,
      state,
    };

    const tokenSet = await client.callback(
      req.headers.referer.substring(0, req.headers.referer.indexOf('?')) || req.headers.referer,
      params,
      checks,
    );
    if (tokenSet) req.session.tokenSet = tokenSet;
    req.session.save();

    try {
      // validate id token
      idToken = await verifyIdToken(tokenSet.id_token, req.session.nonce, client, config);
      if (idToken.hasOwnProperty('sub')) {
        req.session.userId = idToken.sub;
        isLoggedIn = true;
        req.session.save();
      }
    } catch (e) {
      throw new Error(e);
    }

    if (code_verifier) {
      delete req.session.code_verifier;
      delete req.session.code_challenge;
    }
    delete req.session.nonce;
    delete req.session.state;

    if (req.header('x-csrf-token')) {
      try {
        csrfToken = decrypt(req.session.userId, req.header('x-csrf-token'), config.secretKey);
      } catch (e) {
        csrfToken = encrypt(req.session.userId, config.secretKey);
      }
    } else {
      csrfToken = encrypt(req.session.userId, config.secretKey);
    }
  } else {
    isLoggedIn = !!(req.session && req.session.userId);
    if (isLoggedIn && req.session.tokenSet && req.session.tokenSet.id_token) {
      idToken = jwt.decode(req.session.tokenSet.id_token);
      csrfToken = encrypt(req.session.userId, config.secretKey);
    } else {
      isLoggedIn = false;
    }
    if (req.session) req.session.save();
  }

  const { useAuthorization, allowRegistrations, useSessionManagement } = config;
  const permissions = isLoggedIn
    ? await buildPermissions(req.session.userId)
    : await buildPermissions();
  Object.keys(permissions).forEach((key) => (permissions[key] = { actions: permissions[key] }));

  const resBody = {
    isLoggedIn,
    config: { useAuthorization, allowRegistrations, useSessionManagement },
    user: idToken,
    handled: !!(urlData.state && urlData.code),
    permissions: permissions,
    csrfToken,
  };

  if (!isLoggedIn) {
    if (req.session) req.session.destroy();
    res.clearCookie('id', { path: '/' });
    return res.status(200).json(resBody);
  }

  const tempSession = req.session;
  req.session.regenerate((err) => {
    Object.assign(req.session, tempSession);
    if (err) {
      req.session.destroy();
    }
    return res.status(200).json(resBody);
  });
};

export default { login, handleOauthCallback };

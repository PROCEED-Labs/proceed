import { revokeUserToken } from './tokenHandler.js';

/**
 * builds logout url
 *
 * @param {Object} req - express request object
 * @param {Object} res - express response object
 * @param {Object} client - OpenID Client
 * @param {Object} config - iam configuration
 * @return {String} - logout url
 */
export const logout = async (req, res, client, config) => {
  const { returnUrl } = req.query;

  try {
    // if idp logout enabled in config, revoke token for user
    if (config.idpLogout) {
      revokeUserToken(req, client);
    }
    req.session.destroy();
    res.clearCookie('id');

    // logout user from idp if enabled in config or only redirect back to PROCEED MS
    return res.redirect(
      config.idpLogout
        ? await client.endSessionUrl({
            post_logout_redirect_uri: returnUrl || req.headers.referer,
          })
        : returnUrl || req.headers.referer
    );
  } catch (e) {
    return res.redirect(returnUrl || req.headers.referer);
  }
};

export default { logout };

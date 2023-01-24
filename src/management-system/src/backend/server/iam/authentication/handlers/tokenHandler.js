import url from 'url';

/**
 * refreshes the user's access token
 *
 * @param {Object} req - express request object
 * @param {Object} client - OpenID Client
 */
export const refreshUserToken = async (req, client) => {
  if (req.session && req.session.tokenSet) {
    const { refresh_token } = req.session.tokenSet;
    try {
      const tokenSet = await client.refresh(refresh_token);
      if (tokenSet) {
        req.session.tokenSet = tokenSet;
        req.session.save();
      }
    } catch (e) {
      throw new Error('Unable to refresh tokens.');
    }
  } else {
    throw new Error('No tokenSet available.');
  }
};

/**
 * revokes the user's access token at the idp
 *
 * @param {Object} req - express request object
 * @param {Object} client - OpenID Client
 */
export const revokeUserToken = async (req, client) => {
  if (req.session && req.session.tokenSet) {
    const { access_token, refresh_token } = req.session.tokenSet;
    try {
      await client.revoke(refresh_token);
      // auth0 doesn't allow to revoke access tokens
      if (!url.parse(client.issuer.issuer).hostname.match('\\.auth0\\.com$')) {
        await client.revoke(access_token);
      }
    } catch (e) {
      throw new Error('Unable to revoke tokens.');
    }
  }
};

export default { refreshUserToken, revokeUserToken };

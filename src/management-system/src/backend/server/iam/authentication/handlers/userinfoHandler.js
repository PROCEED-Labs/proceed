import { refreshUserToken } from './tokenHandler.js';
import { retry } from '../../utils/utils.js';

/**
 * fetches userinfo from idp /userinfo endpoint
 *
 * @param {Object} req - express request object
 * @param {Object} res - express response object
 * @param {Object} client - OpenID Client
 * @return {Object} - userinfo object
 */
export const getUserinfo = async (req, res, client) => {
  let userinfo;
  try {
    userinfo = await retry(
      () => client.userinfo(req.session.tokenSet.access_token, () => refreshUserToken(req, client)),
      1,
      0
    );
  } catch (e) {
    return res.status(400).json('Unable to retreive userinfo.');
  }
  return res.status(200).json(userinfo);
};

export default { getUserinfo };

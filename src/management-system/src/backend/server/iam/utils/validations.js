import jwt from 'jsonwebtoken';
import url from 'url';
import logger from '../../../shared-electron-server/logging.js';

/**
 * verifies signature of id token and validates algorithm, audience, issuer and nonce
 *
 * @param {Object} token - encoded id token
 * @param {String} nonce - nonce
 * @param {Object} client - OpenID Client
 * @return {Object} - decoded id token
 */
export const verifyIdToken = async (idToken, nonce, client, config) => {
  try {
    // get public certificate from idp before verify id token
    const keyStore = await client.issuer.keystore();
    const pubKey = [...keyStore['_keys']][0].x5c[0];
    const begin = '-----BEGIN CERTIFICATE-----\n';
    const end = '\n-----END CERTIFICATE-----';
    const certificate = begin.concat(pubKey, end);

    // verify and decode id token
    const decodedIdToken = jwt.verify(idToken, certificate, {
      algorithms: ['RS256'],
      audience: client.client_id,
      issuer: url.parse(client.issuer.issuer).hostname.match('\\.auth0\\.com$')
        ? client.issuer.issuer
        : `${client.baseAuthUrl}/realms/${config.tenant}`,
      nonce,
    });

    return decodedIdToken;
  } catch (e) {
    logger.error(e.toString());
    throw new Error(e.toString());
  }
};

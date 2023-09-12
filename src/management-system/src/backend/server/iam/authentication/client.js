import { Issuer } from 'openid-client';
import url from 'url';
import { createAdminUser } from '../utils/admin.js';
import __dirname from '../../dirname-node.js';
import logger from '../../../shared-electron-server/logging.js';
import { ensureNoBackslash, sortSpaceDelimitedString } from '../utils/utils.js';
import { setGlobalRolesForAuthorization } from '../authorization/caslRules';
import { getRoles } from '../../../shared-electron-server/data/iam/roles.js';

export let client;

/**
 * creates openid client with library: https://github.com/panva/node-openid-client/blob/main/docs/README.md#client
 *
 * @param {Object} config - the iam configuration
 * @returns {Object} - OpenID Client
 */
const getClient = async (config) => {
  try {
    const issuer = await Issuer.discover(config.baseAuthUrl);

    if (issuer) {
      // check if signing algorithm is supported by idp
      const issuerTokenAlgs = Array.isArray(issuer.id_token_signing_alg_values_supported)
        ? issuer.id_token_signing_alg_values_supported
        : [];
      if (!issuerTokenAlgs.includes(config.tokenSigningAlgorithm)) {
        throw new Error('ID token algorithm is not supported by idp.');
      }

      // check if response type is supported by idp
      const issuerRespTypes = Array.isArray(issuer.response_types_supported)
        ? issuer.response_types_supported
        : [];
      if (!issuerRespTypes.map(sortSpaceDelimitedString).includes(config.response_type)) {
        throw new Error('Response type is not supported by idp.');
      }

      // check if response mode is supported by idp
      const configRespMode = config.response_mode;
      const issuerRespModes = Array.isArray(issuer.response_modes_supported)
        ? issuer.response_modes_supported
        : [];
      if (configRespMode && !issuerRespModes.includes(configRespMode)) {
        throw new Error('Response mode is not supported by idp.');
      }

      client = new issuer.Client({
        client_id: config.clientID,
        client_secret: config.clientSecret,
        id_token_signed_response_alg: config.tokenSigningAlgorithm,
        token_endpoint_auth_method: config.clientAuthMethod,
      });

      // custom logout endpoint for auth0 because it doesn't correspond to the standard
      if (url.parse(issuer.issuer).hostname.match('\\.auth0\\.com$')) {
        client.endSessionUrl = (params) => {
          const { id_token_hint, post_logout_redirect_uri, ...extraParams } = params;

          const parsedUrl = url.parse(`${ensureNoBackslash(issuer.issuer)}/v2/logout`);
          parsedUrl.query = {
            ...extraParams,
            returnTo: post_logout_redirect_uri,
            client_id: client.client_id,
          };

          Object.entries(parsedUrl.query).forEach(([key, value]) => {
            if (value === null || value === undefined) {
              delete parsedUrl.query[key];
            }
          });

          return url.format(parsedUrl);
        };
      }

      // create admin user at idp if enabled in config
      if (config.createIdpAdmin) {
        await runClientCredentialsFlow(config);
        await createAdminUser();
      }

      // set global roles for authorization
      const globalRoles = { everybodyRole: '', guestRole: '' };
      for (const role of getRoles()) {
        if (role.name === '@guest') globalRoles.guestRole = role.id;
        else if (role.name === '@everyone') globalRoles.guestRole = role.id;
      }

      setGlobalRolesForAuthorization(globalRoles);

      return client;
    }
  } catch (e) {
    logger.error(e.toString());
    throw new Error(e.toString());
  }
};

/**
 * runs client credentials flow to re-authenticate service account
 *
 * @param {Object} config - the iam configuration
 */
export const runClientCredentialsFlow = async (config) => {
  try {
    const tokenSet = await client.grant({
      grant_type: 'client_credentials',
      scope: config.clientCredentialScope,
    });
    if (tokenSet) {
      client.tokenSet = tokenSet;
    }
  } catch (e) {
    logger.error(e.toString());
    throw new Error(e.toString());
  }
};

export default getClient;

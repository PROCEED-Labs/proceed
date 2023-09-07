import axios from 'axios';
import url from 'url';
import logger from '../../../shared-electron-server/logging.js';
import { client } from '../authentication/client.js';
import { retry, ensureNoBackslash } from '../../iam/utils/utils.js';
import { runClientCredentialsFlow } from '../authentication/client.js';

// function build config for http request, performs request and returns intended values
const doRequest = async (url, client, options = undefined) => {
  const axiosConfig = {
    method: 'GET',
    url,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${client.tokenSet.access_token}`,
    },
  };
  if (options !== null && typeof options === 'object') {
    axiosConfig.method = options.method;
    axiosConfig.data = options.body;
  }
  try {
    const response = await axios(axiosConfig);
    if (options !== null && typeof options === 'object' && options.returnIdOfLocationHeader) {
      const id = response.headers.location.match(
        /[A-F\d]{8}-[A-F\d]{4}-4[A-F\d]{3}-[89AB][A-F\d]{3}-[A-F\d]{12}$/i // regex extracts uuid of location header
      )[0];
      if (id) {
        return id;
      } else {
        logger.debug('Response Header: ', response.headers);
        throw new Error('No id in location header found!');
      }
    }
    return response.data;
  } catch (err) {
    const { status, data } = err.response;
    throw { status, data };
  }
};

/**
 * function prepares http requests
 * @param {String} path - request path
 * @param {Object} options - default undefined, otherwise necessary http request options
 * @returns {Object|Array|String} - response of http request
 */
const restRequest = async (path, options = undefined, config) => {
  const adminBaseUrl = url.parse(client.issuer.issuer).hostname.match('\\.auth0\\.com$')
    ? `${ensureNoBackslash(client.issuer.issuer)}/api/v2`
    : client.issuer.issuer.split('/auth/').join('/auth/admin/');

  try {
    const response = await retry(
      () => doRequest(adminBaseUrl + path, client, options),
      () => runClientCredentialsFlow(config),
      1,
      0
    );
    return response;
  } catch (e) {
    throw e;
  }
};

export default restRequest;

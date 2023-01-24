import axios from 'axios';
import { config } from '../utils/config.js';
import { retry } from '../utils/utils.js';

export const doOpaRequest = async (path, options = undefined) => {
  const axiosConfig = {
    method: 'GET',
    url: path
      ? `http://${config.opaHost}:${parseInt(config.opaPort)}/${
          config.opaVersion || 'v1'
        }/data/${path}`
      : `http://${config.opaHost}:${parseInt(config.opaPort)}`,
    headers: {
      Accept: 'application/json',
    },
  };
  if (options !== null && typeof options === 'object') {
    axiosConfig.method = options.method;
    axiosConfig.data = options.body;
  }

  try {
    const opaResponse = await retry(() => axios(axiosConfig), undefined, 2);
    return opaResponse.data;
  } catch (e) {
    throw new Error(e);
  }
};

export const ensureOpaSync = async (path, method = undefined, document = undefined) => {
  const options = {
    method: 'PUT',
  };

  if (method) options.method = method;
  if (document) options.body = document;

  try {
    if (config.useAuthorization) {
      const opaResponse = await doOpaRequest(path, options);
      return opaResponse;
    }
    return;
  } catch (e) {
    throw new Error(e.toString());
  }
};

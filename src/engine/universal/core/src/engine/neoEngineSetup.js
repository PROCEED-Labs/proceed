const NeoEngine = require('neo-bpmn-engine');
const system = require('@proceed/system');
const capabilities = require('@proceed/capabilities');

const allowedResponseKeys = [
  'httpVersionMajor',
  'httpVersionMinor',
  'httpVersion',
  'complete',
  'rawHeaders',
  'rawTrailers',
  'joinDuplicateHeaders',
  'aborted',
  'upgrade',
  'url',
  'method',
  'statusCode',
  'statusMessage',
];
/** @param {{response: import('http').IncomingMessage, body: any}} response */
function networkResponseToSerializable(response) {
  if (!response || !response.response) return response;
  const filteredResponse = {};
  for (const key of allowedResponseKeys) filteredResponse[key] = response.response[key];
  return { response: filteredResponse, body: response.body };
}

/** @param {(...args: any[]) => Promise<any>} fn */
function errorWrapper(fn) {
  return async function (...args) {
    try {
      const response = await fn.call(...args);
      return networkResponseToSerializable(response);
    } catch (error) {
      if (error && typeof error === 'object' && 'body' in error && 'response' in error) {
        throw networkResponseToSerializable(error);
      } else {
        throw error;
      }
    }
  };
}

module.exports = {
  setupNeoEngine() {
    // Register the modules which we wish to make use of in the script environment
    NeoEngine.provideService('capabilities', {
      startCapability: (_processId, _processInstanceId, _tokenId, capabilityName, args, callback) =>
        capabilities.startCapability.call(capabilities, capabilityName, args, callback),
    });
    NeoEngine.provideService('network-requests', {
      get: (_processId, _processInstanceId, _tokenId, url, options) => {
        return errorWrapper(system.http.request)(system.http, url, {
          ...options,
          method: 'GET',
        });
      },
      post: (
        _processId,
        _processInstanceId,
        _tokenId,
        url,
        body,
        contentType = 'text/plain',
        options = {},
      ) => {
        return errorWrapper(system.http.request)(system.http, url, {
          ...options,
          body,
          method: 'POST',
          headers: {
            ...options.headers,
            'Content-Type': contentType,
          },
        });
      },
      put: (
        _processId,
        _processInstanceId,
        _tokenId,
        url,
        body,
        contentType = 'text/plain',
        options = {},
      ) => {
        return errorWrapper(system.http.request)(system.http, url, {
          ...options,
          body,
          method: 'PUT',
          headers: {
            ...options.headers,
            'Content-Type': contentType,
          },
        });
      },
      delete: (_processId, _processInstanceId, _tokenId, url, options) => {
        return errorWrapper(system.http.request)(system.http, url, {
          ...options,
          method: 'DELETE',
        });
      },
      head: (_processId, _processInstanceId, _tokenId, url, options) => {
        return errorWrapper(system.http.request)(system.http, url, {
          ...options,
          method: 'HEAD',
        });
      },
    });
  },
};

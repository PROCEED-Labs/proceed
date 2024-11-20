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
/** @param {{response: import('http').IncomingMessage, body: string}} response */
function networkResponseToSerializable(response) {
  if (!response || !response.response) return response;
  const filteredResponse = {};
  for (const key of allowedResponseKeys) filteredResponse[key] = response.response[key];
  return { response: filteredResponse, body: response.body };
}

module.exports = {
  setupNeoEngine() {
    // Register the modules which we wish to make use of in the script environment
    NeoEngine.provideService('capabilities', {
      startCapability: (_processId, _processInstanceId, _tokenId, capabilityName, args, callback) =>
        capabilities.startCapability.call(capabilities, capabilityName, args, callback),
    });
    NeoEngine.provideService('network', {
      get: async (_processId, _processInstanceId, _tokenId, url, options) => {
        const response = await system.http.request.call(system.http, url, {
          ...options,
          method: 'GET',
        });
        return networkResponseToSerializable(response);
      },
      post: async (
        _processId,
        _processInstanceId,
        _tokenId,
        url,
        body,
        contentType = 'text/plain',
        options = {},
      ) => {
        const response = await system.http.request.call(system.http, url, {
          ...options,
          body,
          method: 'POST',
          headers: {
            ...options.headers,
            'Content-Type': contentType,
          },
        });
        return networkResponseToSerializable(response);
      },
      put: async (
        _processId,
        _processInstanceId,
        _tokenId,
        url,
        body,
        contentType = 'text/plain',
        options = {},
      ) => {
        const response = await system.http.request.call(system.http, url, {
          ...options,
          body,
          method: 'PUT',
          headers: {
            ...options.headers,
            'Content-Type': contentType,
          },
        });
        return networkResponseToSerializable(response);
      },
      delete: async (_processId, _processInstanceId, _tokenId, url, options) => {
        const response = await system.http.request.call(system.http, url, {
          ...options,
          method: 'DELETE',
        });
        return networkResponseToSerializable(response);
      },
      head: async (_processId, _processInstanceId, _tokenId, url, options) => {
        const response = await system.http.request.call(system.http, url, {
          ...options,
          method: 'HEAD',
        });
        return networkResponseToSerializable(response);
      },
    });
  },
};

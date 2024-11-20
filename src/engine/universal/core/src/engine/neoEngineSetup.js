const NeoEngine = require('neo-bpmn-engine');
const system = require('@proceed/system');
const capabilities = require('@proceed/capabilities');

module.exports = {
  setupNeoEngine() {
    // Register the modules which we wish to make use of in the script environment
    NeoEngine.provideService('capabilities', {
      startCapability: (_processId, _processInstanceId, _tokenId, capabilityName, args, callback) =>
        capabilities.startCapability.call(capabilities, capabilityName, args, callback),
    });
    NeoEngine.provideService('network', {
      get: (_processId, _processInstanceId, _tokenId, url, options) => {
        return system.http.request.call(system.http, url, {
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
        return system.http.request.call(system.http, url, {
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
        return system.http.request.call(system.http, url, {
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
        return system.http.request.call(system.http, url, {
          ...options,
          method: 'DELETE',
        });
      },
      head: (_processId, _processInstanceId, _tokenId, url, options) => {
        return system.http.request.call(system.http, url, {
          ...options,
          method: 'HEAD',
        });
      },
    });
  },
};

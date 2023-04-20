const NeoEngine = require('neo-bpmn-engine');
const system = require('@proceed/system');
const capabilities = require('@proceed/capabilities');

module.exports = {
  setupNeoEngine() {
    // Register the modules which we wish to make use of in the script environment
    NeoEngine.provideService('capabilities', {
      startCapability: (processId, processInstanceId, capabilityName, args, callback) =>
        capabilities.startCapability.call(capabilities, capabilityName, args, callback),
    });
    NeoEngine.provideService('network', {
      get: (processId, processInstanceId, tokenId, url, options) => {
        return system.http.request.call(system.http, url, {
          ...options,
          method: 'GET',
        });
      },
      post: (
        processId,
        processInstanceId,
        tokenId,
        url,
        body,
        contentType = 'text/plain',
        options = {}
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
        processId,
        processInstanceId,
        tokenId,
        url,
        body,
        contentType = 'text/plain',
        options = {}
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
      delete: (processId, processInstanceId, tokenId, url, options) => {
        return system.http.request.call(system.http, url, {
          ...options,
          method: 'DELETE',
        });
      },
      head: (processId, processInstanceId, tokenId, url, options) => {
        return system.http.request.call(system.http, url, {
          ...options,
          method: 'HEAD',
        });
      },
    });
  },
};

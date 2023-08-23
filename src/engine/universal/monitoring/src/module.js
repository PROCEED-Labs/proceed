const { network } = require('@proceed/system');
const { URL } = require('url');
let _management;

const monitoring = {
  start(management) {
    _management = management;

    network.get(`/monitoring/`, { cors: true }, async () => {
      const engines = management.getAllEngines();
      const instanceInformations = engines.flatMap((engine) =>
        engine.instanceIDs.map((instanceID) => engine.getInstanceInformation(instanceID)),
      );
      return JSON.stringify(instanceInformations);
    });
  },

  sendStatusToServer(url, query) {
    if (!_management) {
      throw new Error('monitoring.start() has to be called before this method.');
    }

    // TODO: Filter by process criteria query

    const engines = _management.getAllEngines();
    const instanceInformations = engines.flatMap((engine) =>
      engine.instanceIDs.map((instanceID) => engine.getInstanceInformation(instanceID)),
    );
    const json = JSON.stringify(instanceInformations);

    const { hostname, port, pathname, search } = new URL(url);

    network.sendData(hostname, port, pathname + search, 'POST', 'application/json', json);
  },
};

module.exports = monitoring;

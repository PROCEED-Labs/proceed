const { network } = require('@proceed/system');
const { URL } = require('url');

const capabilitiesRoute = '/capabilities/';
const createConsolidatedList = require('../parser/listParser/createConsolidatedList');

/**
 * Expose an endpoint to list the capabilities of the machine
 */

module.exports = async (capabilities) => {
  network.get(`${capabilitiesRoute}`, { cors: true }, async () => ({
    response: await createConsolidatedList(capabilities.capabilityList),
    mimeType: 'jsonld',
  }));

  network.post(`${capabilitiesRoute}execute`, { cors: true }, async (req) => {
    return new Promise((resolve, reject) => {
      const name = req.body.CapabilityName;
      const parameter = req.body.Parameter;
      const webhook = req.body.Webhook;
      capabilities.startCapability(name, parameter, (err, data) => {
        if (webhook) {
          const { hostname, port, pathname, search } = new URL(webhook);
          network.sendData(hostname, port, pathname + search, 'POST', 'application/json', data);
          resolve('true');
        } else {
          if (data) {
            resolve(JSON.stringify(data));
          } else {
            reject(err);
          }
        }
      });
    });
  });

  network.post(`/capabilities/return`, async (res) => {
    console.log(res);
  });
};

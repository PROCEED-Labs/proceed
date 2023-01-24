const { network } = require('@proceed/system');

const route = '/configuration';

module.exports = (config) => {
  // Read configuration
  network.get(`${route}/`, { cors: true }, async () => {
    const configObj = await config.readConfig();
    return JSON.stringify(configObj);
  });

  network.put(`${route}/`, { cors: true }, async (req) => {
    const configObj = req.body;

    // Either return the newly changed config on success or an error message
    let res;
    await config
      .writeConfig(configObj)
      .then((newConfig) => {
        res = JSON.stringify(newConfig);
      })
      .catch((err) => {
        res = { statusCode: 403, response: err.message };
      });

    return res;
  });

  network.delete(`${route}/`, { cors: true }, async () => {
    let res;
    await config
      .writeConfig({})
      .then((newConfig) => {
        res = JSON.stringify(newConfig);
      })
      .catch((err) => {
        res = { statusCode: 403, response: err.message };
      });

    return res;
  });

  network.get(`${route}/:key`, { cors: true }, async (req) => {
    const { key } = req.params;
    const configValue = await config.readConfig(key);

    if (typeof configValue === 'undefined') {
      return { statusCode: 404 };
    }

    return JSON.stringify({ [key]: configValue });
  });

  // TODO: Bug Update of single config keys in object structure not possible
  // e.g. configuration/logs.consoleLevel => { "logs.consoleLevel": "debug" }

  // network.put(`${route}/:key`, { cors: true }, async (req) => {
  //   const { key } = req.params;
  //   const { body } = req;
  //   const value = body[key];

  //   // Either return the newly changed config on success or an error message
  //   let res;
  //   await config.writeConfigValue(key, value)
  //     .then(() => { res = JSON.stringify({ [key]: value }); })
  //     .catch((err) => { res = { statusCode: 403, response: err.message }; });

  //   return res;
  // });
};

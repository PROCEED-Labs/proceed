const { network, data } = require('@proceed/system');
const config = require('../../../configuration/configHandler');

const route = '/logging';

module.exports = (logging) => {
  network.get(`${route}`, { cors: true }, async (req) => {
    const { entries: limit } = req.query;
    const logData = await logging.getAllLogTables(limit);
    return JSON.stringify(logData);
  });

  network.delete(`${route}`, { cors: true }, async () => {
    await logging.deleteAllLogs();
    return { statusCode: 200 };
  });

  network.get(`${route}/status`, { cors: true }, async () => {
    const meta = JSON.parse(await data.read('logging_meta_data.json/config'));
    const intervalInSeconds = await config.readConfig('logs.rotationInterval');
    const intervalInMilliSeconds = intervalInSeconds * 1000;
    const now = new Date().getTime();
    let nextRotation = meta.rotationStartTime + intervalInMilliSeconds;
    while (nextRotation < now) {
      nextRotation += intervalInMilliSeconds;
    }
    meta.nextRotation = new Date(nextRotation);
    return JSON.stringify(meta);
  });

  network.get(`${route}/standard`, { cors: true }, async (req) => {
    const { entries: limit } = req.query;
    let logData = await logging.getStandardLogTables(limit);
    logData = logData
      ? JSON.stringify(logData)
      : { response: 'No standard logs have been made yet', mimeType: 'html' };
    return logData;
  });

  network.delete(`${route}/standard`, { cors: true }, async () => {
    logging.deleteStandardLogs();
    return { statusCode: 200 };
  });

  network.get(`${route}/process`, { cors: true }, async (req) => {
    const { entries: limit = 100 } = req.query;
    const processData = await config.readConfigData('processLogs');
    const processInfos = processData.map((pd) => ({ pFN: pd.definitionId }));
    const res = processInfos.reduce(async (accPromise, { pFN }) => {
      const acc = await accPromise;
      const logData = await logging.getProcessLogTables(pFN, limit);
      acc[pFN] = logData;
      // keep in mind that acc is a promise
      return acc;
    }, Promise.resolve({}));
    const processLogObject = await res;
    return JSON.stringify(processLogObject);
  });

  network.delete(`${route}/process`, { cors: true }, async () => {
    logging.deleteProcessesLogs();
    return { statusCode: 200 };
  });

  network.get(`${route}/process/:definitionId`, { cors: true }, async (req) => {
    const { entries: limit = 100 } = req.query;
    const { definitionId } = req.params;
    const processInfo = (await config.readConfigData('processLogs')).find(
      (pd) => pd.definitionId === definitionId,
    );

    if (!processInfo) {
      return { response: 'No logs for this process have been made yet', mimeType: 'html' };
    }

    let logData = await logging.getProcessLogTables(definitionId, limit);
    logData = logData
      ? JSON.stringify(logData)
      : { response: 'No logs for this process have been made yet', mimeType: 'html' };
    return logData;
  });

  network.delete(`${route}/process/:definitionId`, { cors: true }, async (req) => {
    const { definitionId } = req.params;
    const processInfo = (await config.readConfigData('processLogs')).find(
      (pd) => pd.definitionId === definitionId,
    );

    if (!processInfo) {
      return { response: 'No logs for this process have been made yet', mimeType: 'html' };
    }

    logging.deleteProcessLogs(definitionId);
    return { statusCode: 200 };
  });

  network.get(
    `${route}/process/:definitionId/instance/:instanceId`,
    { cors: true },
    async (req) => {
      const { entries: limit = 100 } = req.query;
      const { definitionId, instanceId } = req.params;
      const processInfo = (await config.readConfigData('processLogs')).find(
        (pd) => pd.definitionId === definitionId,
      );

      if (!processInfo) {
        return { response: 'No logs for this process have been made yet', mimeType: 'html' };
      }

      let instanceLogs = await logging.getInstanceLogs(definitionId, instanceId, limit);

      instanceLogs = instanceLogs
        ? JSON.stringify(instanceLogs)
        : { response: 'No logs for this instance have been made yet', mimeType: 'html' };
      return instanceLogs;
    },
  );

  network.delete(
    `${route}/process/:definitionId/instance/:instanceId`,
    { cors: true },
    async (req) => {
      const { definitionId, instanceId } = req.params;
      const processInfo = (await config.readConfigData('processLogs')).find(
        (pd) => pd.definitionId === definitionId,
      );

      if (!processInfo) {
        return { response: 'No logs for this process have been made yet', mimeType: 'html' };
      }

      logging.deleteInstanceLogs(definitionId, instanceId);

      return { statusCode: 200 };
    },
  );
};

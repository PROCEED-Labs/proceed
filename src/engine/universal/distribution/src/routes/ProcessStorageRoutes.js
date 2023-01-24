const { network } = require('@proceed/system');
const { logging } = require('@proceed/machine');
const db = require('../database/db');
const APIError = require('./ApiError');
const { getAllInstances } = require('./helpers.js');

/**
  @param {*} path  = "/process/..."
  :definitionId = the definitions-id of a BPMN file
*/
module.exports = (path, management) => {
  const log = logging.getLogger({ moduleName: 'DISTRIBUTION' });

  async function getFullDeploymentInfo(definitionId) {
    let process = await db.getProcessInfo(definitionId);

    process.instances = await getAllInstances(management, definitionId);

    return process;
  }

  network.get(`${path}/`, { cors: true }, async (req) => {
    const processes = await db.getAllProcesses();
    let processesInfos = processes.map(async (definitionId) => ({
      ...(await getFullDeploymentInfo(definitionId)),
    }));
    processesInfos = await Promise.all(processesInfos);
    return JSON.stringify(processesInfos);
  });

  network.post(`${path}/`, { cors: true }, async (req) => {
    const { body } = req;
    const { bpmn } = body;
    const { definitionId, version } = await db.saveProcessVersionDefinition(bpmn);
    log.info(`Process version deployed (id: ${definitionId}, version: ${version})`);
    return JSON.stringify(bpmn);
  });

  network.get(`${path}/:definitionId`, { cors: true }, async (req) => {
    const { definitionId } = req.params;
    let process;
    try {
      process = await getFullDeploymentInfo(definitionId);
    } catch {
      throw new APIError(404, `There is no process with the given definitionId: ${definitionId}`);
    }
    return JSON.stringify(process);
  });

  network.get(`${path}/:definitionId/versions`, { cors: true }, async (req) => {
    const { definitionId } = req.params;

    try {
      const process = await db.getProcessInfo(definitionId);
      return JSON.stringify(process.versions.map(({ version }) => version));
    } catch ({ message }) {
      throw new APIError(404, message);
    }
  });

  network.get(`${path}/:definitionId/versions/:version`, { cors: true }, async (req) => {
    const { definitionId, version } = req.params;

    try {
      return JSON.stringify(await db.getProcessVersionInfo(definitionId, version));
    } catch ({ message }) {
      throw new APIError(404, message);
    }
  });

  network.delete(`${path}/:definitionId`, { cors: true }, async (req) => {
    const { definitionId } = req.params;
    management.removeProcessEngine(definitionId);
    await db.deleteProcess(definitionId);
    log.info(`Process deleted: ${definitionId}`);
    return JSON.stringify({});
  });
};

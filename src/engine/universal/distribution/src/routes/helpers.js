const db = require('../database/db');

async function getAllInstances(management, definitionId) {
  const engine = management.getEngineWithDefinitionId(definitionId);
  const archivedInstances = await db.getArchivedInstances(definitionId);

  const archivedInstanceIds = Object.keys(archivedInstances);

  let instances = [];

  if (engine) {
    engine.instanceIDs.forEach((instanceId) => {
      if (!archivedInstanceIds.includes(instanceId)) {
        instances.push(engine.getInstanceInformation(instanceId));
      }
    });
  }

  return instances.concat(Object.values(archivedInstances));
}

module.exports = {
  getAllInstances,
};

const { network } = require('@proceed/system');

const route = '/machine';

module.exports = (machineInformation) => {
  network.get(`${route}/:properties`, { cors: true }, async (req) => {
    const propertyList = req.params.properties.split(',');
    const properties = await machineInformation.getMachineInformation(propertyList);

    return JSON.stringify(properties);
  });

  network.get(`${route}/`, { cors: true }, async () => {
    const machineData = await machineInformation.getMachineInformation();

    return JSON.stringify(machineData);
  });
};

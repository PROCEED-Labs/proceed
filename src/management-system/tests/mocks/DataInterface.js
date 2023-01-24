class DataInterface {
  constructor(eventHandler) {}
}

DataInterface.prototype.get = jest.fn();
DataInterface.prototype.set = jest.fn();
DataInterface.prototype.addToStore = jest.fn();
DataInterface.prototype.removeFromStore = jest.fn();
DataInterface.prototype.updateInStore = jest.fn();
DataInterface.prototype.updateConfig = jest.fn();

DataInterface.prototype.getMachines = jest.fn();
DataInterface.prototype.addMachine = jest.fn();
DataInterface.prototype.removeMachine = jest.fn();
DataInterface.prototype.updateMachine = jest.fn();

DataInterface.prototype.updateConfig = jest.fn();

DataInterface.prototype.getEnvironmentProfileJSON = jest.fn();
DataInterface.prototype.saveEnvProfile = jest.fn();
DataInterface.prototype.deleteEnvProfile = jest.fn();

export default DataInterface;

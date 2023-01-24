class ProcessInterface {
  constructor(eventHandler) {}
}

ProcessInterface.prototype.getProcesses = jest.fn();
ProcessInterface.prototype.getProcess = jest.fn();
ProcessInterface.prototype.addProcess = jest.fn();
ProcessInterface.prototype.removeProcess = jest.fn();
ProcessInterface.prototype.updateProcess = jest.fn();
ProcessInterface.prototype.updateProcessMetaData = jest.fn();
ProcessInterface.prototype.updateWholeXml = jest.fn();
ProcessInterface.prototype.updateProcessName = jest.fn();
ProcessInterface.prototype.updateProcessDescription = jest.fn();
ProcessInterface.prototype.updateConstraints = jest.fn();
ProcessInterface.prototype.updateResources = jest.fn();
ProcessInterface.prototype.saveUserTaskHTML = jest.fn();
ProcessInterface.prototype.getUserTasksHTML = jest.fn();
ProcessInterface.prototype.deleteUserTaskHTML = jest.fn();
ProcessInterface.prototype.saveImage = jest.fn();
ProcessInterface.prototype.saveScriptTaskJS = jest.fn();
ProcessInterface.prototype.blockProcess = jest.fn();
ProcessInterface.prototype.unblockProcess = jest.fn();
ProcessInterface.prototype.blockTask = jest.fn();
ProcessInterface.prototype.unblockTask = jest.fn();
ProcessInterface.prototype.broadcastBPMNEvents = jest.fn();
ProcessInterface.prototype.broadcastScriptChangeEvent = jest.fn();

export default ProcessInterface;

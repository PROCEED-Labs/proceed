class EngineInterface {
  constructor(eventHandler) {}
}

EngineInterface.prototype.activateSilentMode = jest.fn();
EngineInterface.prototype.deactivateSilentMode = jest.fn();

EngineInterface.prototype.getConfig = jest.fn();
EngineInterface.prototype.setConfig = jest.fn();

export default EngineInterface;

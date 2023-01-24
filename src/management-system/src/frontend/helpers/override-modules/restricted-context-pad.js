export default class CustomContextPad {
  constructor(config, contextPad, injector) {
    if (config.autoPlace !== false) {
      this.autoPlace = injector.get('autoPlace', false);
    }

    contextPad.registerProvider(this);
  }

  getContextPadEntries() {
    return {};
  }
}

CustomContextPad.$inject = ['config', 'contextPad', 'injector'];

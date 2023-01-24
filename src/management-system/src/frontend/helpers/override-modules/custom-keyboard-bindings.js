import KeyboardBindings from 'diagram-js/lib/features/keyboard/KeyboardBindings';

class DisableKeyboardBinding extends KeyboardBindings {
  constructor(eventBus, injector, keyboard) {
    super(eventBus, keyboard);

    injector.invoke(KeyboardBindings, this);
  }

  registerBindings(keyboard, editorActions) {
    keyboard.addListener(10000, (context) => {
      const event = context.keyEvent;
      if (!process.env.IS_ELECTRON) {
        if (keyboard.isKey(['z', 'Z'], event) && keyboard.isCmd(event)) {
          return true;
        }

        if (keyboard.isKey(['y', 'Y'], event) && keyboard.isCmd(event)) {
          return true;
        }
      }
    });
  }
}

DisableKeyboardBinding.$inject = ['eventBus', 'injector', 'keyboard'];

export default {
  __init__: ['disableKeyboardBinding'],
  disableKeyboardBinding: ['type', DisableKeyboardBinding],
};

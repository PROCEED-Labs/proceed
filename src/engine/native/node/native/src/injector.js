// We detect if this is the built version of the PROCEED engine, meaning
// that the native part and the universal are separately bundled and are
// available as `proceed-engine.js` and `universal.js`.
// eslint-disable-next-line no-undef
const isElectronOrServer =
  (typeof navigator !== 'undefined' &&
    navigator.userAgent &&
    navigator.userAgent.toLowerCase().indexOf(' electron/') > -1) ||
  process.env.SERVER;

// If webpack is used (bundled) and we are not in electron, then we have the
// universal part separately bundled.
// eslint-disable-next-line camelcase
const bundledExternalUniversal = typeof __webpack_require__ === 'function' && !isElectronOrServer;

// This file is part of the forked universal engine, so we don't need to set up
// the IPC here.
const engine = bundledExternalUniversal
  ? __non_webpack_require__('./universal.js')
  : require('@proceed/core');

// We have to require all injected modules here instead of the top-level
// index.js, because they have to be available in the separated process for the
// universal engine.

var isValid = require('is-valid-path');

// Require all injected modules, if any
engine.injectModules = (deps) => {
  console.log(deps);
  const modules = deps.map((dep) => {
    // webpack replaces dynamic requires with errors
    let injMod;
    try {
      injMod = typeof __webpack_require__ !== 'undefined' ? __webpack_require__(dep) : require(dep);
    } catch (error) {
      return;
    }
    const injInstance = new injMod();
    console.log(injInstance);
    injInstance.onAfterEngineLoaded(engine);
    return injInstance;
  });

  // Keep a reference
  engine.modules = modules;
};

// Inject the fork args dependencies
const injectedDeps = process.argv
  .slice(2)
  .filter((dep) => (dep.startsWith('.') || dep.startsWith('/')) && isValid(dep));

if (injectedDeps.length > 0) {
  engine.injectModules(injectedDeps);
}

module.exports = engine;

## TODOs before test

- use ES6 module syntax in `separator.js` to include `bpmn-moddle` and export BPMNSeparator
- create a polyfilled bundle with webpack and babel (Espruino is only able to understand Node v8)
- include the polyfilled bundle in `build/index.html`

## Modules

Espruino resolves modules differently than node. The closest way to replicate a `require` behaviour is to put all modules into the modules folder, which `espruino` will look for in the directory it's being executed from.

// This file is necessary since we can't use __dirname in the index.js in ESM
// with node. Instead we have to construct it ourself using import.meta.url
// Webpack does not understand it (yet) but the replacement uses window, which
// does not work in node, so we have to manually swap it out with this file in
// the webpack config.

// So in conclusion we use this import.meta.url when developing in node and swap
// it out with the normal __dirname for the production build (which is not in
// ESM).

import { dirname } from 'path';
import { fileURLToPath } from 'url';

export default dirname(fileURLToPath(import.meta.url));

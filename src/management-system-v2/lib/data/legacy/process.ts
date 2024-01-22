import { init } from './_process';

// await is only supported at the top level of modules, so we have to do this:
await init();

export * from './_process';

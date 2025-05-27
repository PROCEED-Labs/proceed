import z from 'zod';
import {
  EnvironmentOnlyMSConfig,
  mergedMSConfigSchemaKeys,
  environmentOnlyMSConfigSchemaKeys,
} from './config-schema';

const runtimeEnvVariables: Record<string, any> = {};
for (const variable of Object.keys(mergedMSConfigSchemaKeys))
  runtimeEnvVariables[variable] = process.env[variable];

// TODO: should some variables be required in the env-vars
// This definitely needs to be worked out before using this

const parsingResult = z.object(environmentOnlyMSConfigSchemaKeys).safeParse(runtimeEnvVariables);

const onBuild = process.env.NEXT_PHASE === 'phase-production-build';

if (!parsingResult.success && !onBuild) {
  let msg = '';
  for (const [variable, error] of Object.entries(parsingResult.error.flatten().fieldErrors))
    msg += `${variable}: ${JSON.stringify(error)}\n`;

  console.error(`❌ Error parsing environment variables\n${msg}`);
  process.exit(1);
}

// '_' prefix to signal that this should only be used internally in the ms-config "module"
export const _env: Extract<typeof parsingResult, { success: true }>['data'] = parsingResult.success
  ? parsingResult.data
  : ({} as any);

// Change type to EnvironmentOnlyMSConfig, such that this is only used for variables we know that come
// from the env
export const env = _env as EnvironmentOnlyMSConfig;

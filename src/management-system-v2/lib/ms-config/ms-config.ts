import 'server-only';

import db from '@/lib/data/db';
import { cache } from 'react';
import {
  ConfigurableMSConfig,
  EnvironmentOnlyMSConfig,
  PublicMSConfig,
  getDefaultMSConfigValues,
  mSConfigEnvironmentOnlyKeys,
  PrivateMSConfig,
  configurableMSConfigSchemaKeys,
  msConfigConfigurableKeys,
} from './config-schema';
import { env } from './env-vars';
import { z } from 'zod';

// Always use the same id for the config table to avoid having multiple entries
const MS_CONFIG_ROW_ID = 0;

const MSConfigReadOnlyKeysSet = new Set(mSConfigEnvironmentOnlyKeys as string[]);

const configurableMSConfigSchema = z.object(configurableMSConfigSchemaKeys);
const configurableMSConfigSchemaStrict = configurableMSConfigSchema.strict();

export function filterMSConfigurableValues<T extends Record<string, any>>(
  object: T,
): Partial<{
  [Key in keyof ConfigurableMSConfig]: T[Key];
}> {
  const filtered: Record<string, any> = {};

  for (const [key, value] of Object.entries(object)) {
    if (!MSConfigReadOnlyKeysSet.has(key)) {
      filtered[key] = value;
    }
  }

  return filtered;
}

export async function ensureDefaultMSConfig() {
  const currentConf = await db.mSConfig.findFirst({ select: { config: true } });

  // TODO: should this always be production??
  const defaults = getDefaultMSConfigValues('production');
  const filteredDefaults = filterMSConfigurableValues(defaults);

  if (!currentConf || !currentConf.config)
    return await db.mSConfig.create({
      data: {
        id: MS_CONFIG_ROW_ID,
        config: filteredDefaults,
      },
    });

  const configInDb = currentConf?.config as Record<string, string>;

  const newDefaults: Record<string, string> = {};
  let newDefaultsFound = false;
  for (const [key, value] of Object.entries(filteredDefaults)) {
    if (key in configInDb) continue;
    newDefaultsFound = true;
    newDefaults[key] = value as string;
  }

  if (newDefaultsFound)
    return await db.mSConfig.update({
      where: { id: MS_CONFIG_ROW_ID },
      data: { config: { ...configInDb, ...newDefaults } },
    });
}

export async function writeDefaultMSConfig(force = false) {
  const currentConf = await db.mSConfig.findFirst({ select: { id: true } });
  if (!force && currentConf) throw new Error('MS DB seed: Database already seeded');

  // TODO: should this always be production??
  const defaults = getDefaultMSConfigValues('production');
  const filteredDefaults = filterMSConfigurableValues(defaults);

  if (currentConf)
    return await db.mSConfig.update({
      where: { id: MS_CONFIG_ROW_ID },
      data: { config: filteredDefaults },
    });

  return await db.mSConfig.create({
    data: {
      id: MS_CONFIG_ROW_ID,
      config: filteredDefaults,
    },
  });
}

export async function updateMSConfig(config: Record<keyof ConfigurableMSConfig, string>) {
  // Throws an error if a key has a wrong value or if a key is not in the schema
  // This should also ensure that the all config values are strings
  configurableMSConfigSchemaStrict.parse(config);

  const dbConfig = await db.mSConfig.findFirst({ select: { config: true } });
  if (!dbConfig) throw new Error('MS Config: No config found in DB');

  return await db.mSConfig.update({
    where: { id: MS_CONFIG_ROW_ID },
    data: { config: { ...(dbConfig.config as any), ...config } },
  });
}

export async function getMSConfigDBValues() {
  const config = await db.mSConfig.findFirst({ where: { id: MS_CONFIG_ROW_ID } });
  return config!.config as Record<string, string>;
}

const onBuild = process.env.NEXT_PHASE === 'phase-production-build';
// TODO: make this not async, it's not that good for performance
async function _getMSConfig() {
  const config = await db.mSConfig.findFirst({ where: { id: MS_CONFIG_ROW_ID } });
  const filteredConfig = onBuild ? {} : configurableMSConfigSchema.parse(config?.config);

  const msConfig: Record<string, any> = { _overwrittenByEnv: [] };
  for (const key of Object.keys(env)) {
    const envValue = env[key as keyof EnvironmentOnlyMSConfig];

    if (envValue !== undefined) {
      if (msConfigConfigurableKeys.includes(key as any)) msConfig._overwrittenByEnv.push(key);
      msConfig[key] = envValue;
    } else {
      msConfig[key] = filteredConfig[key];
    }
  }

  return msConfig as PrivateMSConfig & { _overwrittenByEnv: (keyof ConfigurableMSConfig)[] };
}
export const getMSConfig = cache(_getMSConfig);

export function getPublicMSConfig() {
  const msConfig = getMSConfig();
  return Object.fromEntries(
    Object.entries(msConfig).filter(([key]) => key.startsWith('PROCEED_PUBLIC_')),
  ) as PublicMSConfig;
}

import 'server-only';

import db from '@/lib/data/db';
import { cache } from 'react';
import {
  ConfigurableMSConfig,
  PublicMSConfig,
  getDefaultMSConfigValues,
  PrivateMSConfig,
  configurableMSConfigSchemaKeys,
  msConfigConfigurableKeys,
  mergedMSConfigSchemaKeys,
} from './config-schema';
import { _env, env } from './env-vars';
import { z } from 'zod';
import { headers } from 'next/headers';

// Always use the same id for the config table to avoid having multiple entries
const MS_CONFIG_ROW_ID = 0;

const configurableMSConfigSchema = z.object(configurableMSConfigSchemaKeys);

export function filterMSConfigurableValues<T extends Record<string, any>>(
  object: T,
): Partial<{
  [Key in keyof ConfigurableMSConfig]: T[Key];
}> {
  const filtered: Record<string, any> = {};

  for (const [key, value] of Object.entries(object)) {
    if (msConfigConfigurableKeys.includes(key as any)) filtered[key] = value;
  }

  return filtered;
}

export async function getMSConfigDBValuesAndEnsureDefaults() {
  const currentConf = await db.mSConfig.findFirst({ select: { config: true } });

  const defaults = getDefaultMSConfigValues(env.NODE_ENV);
  const filteredDefaults = filterMSConfigurableValues(defaults);

  if (!currentConf || !currentConf.config)
    return (
      await db.mSConfig.create({
        data: {
          id: MS_CONFIG_ROW_ID,
          config: filteredDefaults,
        },
      })
    ).config as Record<string, string>;

  const configInDb = currentConf?.config as Record<string, string>;

  const newDefaults: Record<string, string> = {};
  let newDefaultsFound = false;
  for (const [key, value] of Object.entries(filteredDefaults)) {
    if (key in configInDb) continue;
    newDefaultsFound = true;
    newDefaults[key] = value as string;
  }

  if (newDefaultsFound)
    return (
      await db.mSConfig.update({
        where: { id: MS_CONFIG_ROW_ID },
        data: { config: { ...configInDb, ...newDefaults } },
      })
    ).config as Record<string, string>;

  return configInDb;
}

export async function writeDefaultMSConfig(force = false) {
  const currentConf = await db.mSConfig.findFirst({ select: { id: true } });
  if (!force && currentConf) throw new Error('MS DB seed: Database already seeded');

  const defaults = getDefaultMSConfigValues(env.NODE_ENV);
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
  // Throws an error if a key has a wrong value
  // This should also ensure that all config values are strings
  configurableMSConfigSchema.partial().parse(config);

  const dbConfig = await getMSConfigDBValuesAndEnsureDefaults();

  return await db.mSConfig.update({
    where: { id: MS_CONFIG_ROW_ID },
    data: { config: { ...dbConfig, ...config } },
  });
}

const onBuild = process.env.NEXT_PHASE === 'phase-production-build';
// TODO: make this not async, it's not that good for performance
async function _getMSConfig() {
  // To make every page that calls this function dynamic
  headers();

  // NOTE: maybe ensuring defaults all the time isn't necessary, but it's the best way to avoid
  // development issues, where a config is added and not in the db
  const config = await getMSConfigDBValuesAndEnsureDefaults();
  // NOTE: this could cause problems if the schema is changed, so that the db values are no longer
  // valid
  const filteredConfig = onBuild ? {} : configurableMSConfigSchema.parse(config);

  const msConfig: Record<string, any> = { _overwrittenByEnv: [] };
  for (const key of Object.keys(mergedMSConfigSchemaKeys)) {
    const envValue = _env[key];

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

export async function getPublicMSConfig() {
  const msConfig = await getMSConfig();
  return Object.fromEntries(
    Object.entries(msConfig).filter(([key]) => key.startsWith('PROCEED_PUBLIC_')),
  ) as PublicMSConfig;
}

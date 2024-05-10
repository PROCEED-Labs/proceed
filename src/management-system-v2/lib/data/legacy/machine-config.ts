import store from './store.js';
import Ability, { UnauthorizedError } from '@/lib/ability/abilityHelper';
import { toCaslResource } from '@/lib/ability/caslAbility';
import { MachineConfig } from '../machine-config-schema';

// @ts-ignore
let firstInit = !global.machineConfigMetaObjects;

export let machineConfigMetaObjects: Record<string, MachineConfig> =
  // @ts-ignore
  global.machineConfigMetaObjects || (global.machineConfigMetaObjects = {});

/**
 * initializes the machineConfig meta information objects
 */
export function init() {
  if (!firstInit) return;

  // get machineConfig that were persistently stored
  const storedMachineConfig = store.get('machineConfig') as MachineConfig[];

  // set machineConfig store cache for quick access
  storedMachineConfig.forEach((config) => (machineConfigMetaObjects[config.id] = config));
}
init();

/** Returns all machineConfigs in form of an array */
export function getMachineConfig(environmentId: string, ability?: Ability) {
  const machineConfig = Object.values(machineConfigMetaObjects).filter(
    (config) => config.environmentId === environmentId,
  );

  return ability
    ? machineConfig /*ability.filter('view', 'MachineConfig', machineConfig)*/
    : machineConfig;
}

/**
 * Returns a machineConfig based on machineConfig id
 *
 * @throws {UnauthorizedError}
 */
export function getMachineConfigById(machineConfigId: string, ability?: Ability) {
  const machineConfig = machineConfigMetaObjects[machineConfigId];
  if (!ability) return machineConfig;

  if (
    machineConfig &&
    false /*!ability.can('view', toCaslResource('MachineConfig', machineConfig))*/
  )
    throw new UnauthorizedError();

  return machineConfig;
}

// delete, update, create ... etc.

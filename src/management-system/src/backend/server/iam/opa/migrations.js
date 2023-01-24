import { sharesMetaObjects } from '../../../shared-electron-server/data/iam/shares.js';
import { roleMetaObjects } from '../../../shared-electron-server/data/iam/roles.js';
import { processMetaObjects } from '../../../shared-electron-server/data/process.js';
import { ensureOpaSync } from './opa-client.js';

/**
 * migrates data on server start to the opa cache for policy decision making
 */
export const initOpaCache = async () => {
  try {
    await Promise.all([migrateShares(), migrateRoles(), migrateProcesses()]);
  } catch (e) {
    throw new Error(e.toString());
  }
};

/**
 * migrates all available shares
 */
const migrateShares = async () => {
  try {
    await ensureOpaSync('shares', undefined, sharesMetaObjects);
  } catch (e) {
    throw new Error(e.toString());
  }
};

/**
 * migrates all available roles
 */
const migrateRoles = async () => {
  try {
    const opaCachedRoles = {};
    Object.keys(roleMetaObjects).map(function (key, _) {
      const { expiration, id, name, permissions } = roleMetaObjects[key];
      opaCachedRoles[key] = {
        expiration,
        id,
        name,
        permissions,
        ['default']: roleMetaObjects[key].default,
        admin: roleMetaObjects[key].admin,
        guest: roleMetaObjects[key].guest,
      };
    });
    await ensureOpaSync('roles', undefined, opaCachedRoles);
  } catch (e) {
    throw new Error(e.toString());
  }
};

/**
 * migrates all available processes
 */
const migrateProcesses = async () => {
  try {
    const opaCachedProcesses = {};
    Object.keys(processMetaObjects).map(function (key, index) {
      opaCachedProcesses[key] = processMetaObjects[key];
    });
    await ensureOpaSync('processes', undefined, opaCachedProcesses);
  } catch (e) {
    throw new Error(e.toString());
  }
};

import { z } from 'zod';
import { getAbilityForUser } from './authorization/authorization';
import { getPairingInfo } from './data/mcp-authorization';
import { isUserErrorResponse } from './user-error';
import { getSpaceSettingsValues } from './data/space-settings';
import { ResourceActionType, ResourceType } from './ability/caslAbility';
import { getMSConfig, getPublicMSConfig } from './ms-config/ms-config';
import { PublicMSConfig } from './ms-config/config-schema';

export const authorizationInfoSchema = {
  userCode: z
    .string()
    .describe(
      'Code that identifies the respective user for the MCP tools to fetch the correct data.',
    ),
};

export function toAuthorizationSchema<T extends Record<string, any>>(
  schema: T,
): typeof authorizationInfoSchema & T {
  return { ...authorizationInfoSchema, ...schema };
}

export async function verifyCode(code: string) {
  const msConfig = await getMSConfig();
  if (!msConfig.PROCEED_PUBLIC_MCP_ACTIVE) {
    throw new Error('MCP feature is disabled.');
  }

  if (!code) throw new Error('Invalid user code.');

  const info = await getPairingInfo(code);

  if (isUserErrorResponse(info)) return info;

  const { userId, environmentId } = info;

  const ability = await getAbilityForUser(userId, environmentId);

  return { userId, environmentId, ability };
}

export async function isAccessible(
  userId: string,
  spaceId: string,
  requiredEnvVars: (keyof PublicMSConfig)[] = [],
  configValues: string[] = [],
  permissions: [ResourceActionType, ResourceType][] = [],
) {
  const msConfig = await getPublicMSConfig();
  if (requiredEnvVars.some((eV) => !msConfig[eV])) return false;

  const ability = await getAbilityForUser(userId, spaceId);

  for (const cV of configValues) {
    // allow values that are defined with subpath (e.g. 'process-automation.tasklist')
    const [settingName, ...path] = cV.split('.');
    let settings = await getSpaceSettingsValues(spaceId, settingName, ability);
    if (isUserErrorResponse(settings)) return false;
    if (settings?.active === false) return false;
    let subSetting = settings;
    for (let i = 0; i < path.length && !!subSetting; ++i) {
      if (subSetting[path[i]]?.active === false) return false;
      settings = subSetting[path[i]];
    }
  }

  for (const [action, resource] of permissions) {
    if (!ability.can(action, resource)) return false;
  }

  return true;
}

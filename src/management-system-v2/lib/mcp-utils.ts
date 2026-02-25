import { z } from 'zod';
import { env } from './ms-config/env-vars';
import { getAbilityForUser } from './authorization/authorization';
import { getPairingInfo } from './data/mcp-authorization';
import { isUserErrorResponse } from './user-error';

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
  if (!code) throw new Error('Invalid user code.');

  const info = await getPairingInfo(code);

  if (isUserErrorResponse(info)) return info;

  const { userId, environmentId } = info;

  const ability = await getAbilityForUser(userId, environmentId);

  return { userId, environmentId, ability };
}

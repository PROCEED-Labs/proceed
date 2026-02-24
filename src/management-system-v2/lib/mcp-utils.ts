import { z } from 'zod';
import { env } from './ms-config/env-vars';
import { getAbilityForUser } from './authorization/authorization';
import { getPairingInfo } from './data/mcp-authorization';
import { isUserErrorResponse } from './user-error';

export const authorizationInfoSchema = {
  accessCode: z
    .string()
    .describe(
      'Code that grants access to the MCP tools. Also used to identify which user from which space is trying to access the specific tool.',
    ),
};

export function toAuthorizationSchema<T extends Record<string, any>>(
  schema: T,
): typeof authorizationInfoSchema & T {
  return { ...authorizationInfoSchema, ...schema };
}

export async function verifyCode(code: string) {
  if (!code) throw new Error('Invalid access code.');

  const info = await getPairingInfo(code);

  if (isUserErrorResponse(info)) return info;

  const { userId, environmentId } = info;

  const ability = await getAbilityForUser(userId, environmentId);

  return { userId, environmentId, ability };
}

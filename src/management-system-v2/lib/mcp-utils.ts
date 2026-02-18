import { z } from 'zod';
import { env } from './ms-config/env-vars';
import jwt from 'jsonwebtoken';
import { getAbilityForUser } from './authorization/authorization';

export const authorizationInfoSchema = {
  token: z
    .string()
    .describe(
      'Json Web Token that grants access to the mcp api. Can be requested through the get-access tool.',
    ),
};

export function toAuthorizationSchema<T extends Record<string, any>>(
  schema: T,
): typeof authorizationInfoSchema & T {
  return { ...authorizationInfoSchema, ...schema };
}

export async function verifyToken(token: string) {
  if (!token) throw new Error('Error: Missing access token');

  console.log(
    '\n\n\n========================= Start Token Verification =============================\n\n\n',
  );

  const secret = env.IAM_MCP_ACCESS_ENCRYPTION_SECRET;

  if (!secret) {
    console.error(
      'An mcp client wants to access the mcp server but there is no secret set to create/verify access tokens. Please set IAM_GUEST_CONVERSION_REFERENCE_SECRET in the environment if you want to use MCP.',
    );

    throw new Error('Error: MCP is not enabled.');
  }

  try {
    console.log(token);
    const content = jwt.verify(token, secret);
    console.log(content);
    if (typeof content === 'string') throw new Error('Error: Invalid access token');
    const { sub: userId, environmentId } = content;
    console.log(userId, environmentId);

    if (!userId || !environmentId) throw new Error('Error: Invalid access token');

    const ability = await getAbilityForUser(userId, environmentId);

    console.log(
      '\n\n\n========================= End Token Verification =============================\n\n\n',
    );

    return { userId, environmentId, ability };
  } catch (err) {
    // validation failed
    console.error('MCP token validation failed:', err);
    console.log(
      '\n\n\n========================= Failed Token Verification =============================\n\n\n',
    );
    throw new Error('Error: Invalid access token');
  }
}

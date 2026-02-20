import { type InferSchema } from 'xmcp';
import { toAuthorizationSchema, verifyToken } from '@/lib/mcp-utils';

import { getUserParameter } from '@/lib/data/db/machine-config';
import { isUserErrorResponse } from '@/lib/user-error';

// Define the schema for tool parameters
export const schema = toAuthorizationSchema({});

// Define tool metadata
export const metadata = {
  name: 'get-user-info',
  description: 'Gets data relevant to the user making the request.',
  annotations: {
    title: 'Get User Info',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

// Tool implementation
export default async function getUserData({ token }: InferSchema<typeof schema>) {
  try {
    const { userId, environmentId } = await verifyToken(token);

    const userData = await getUserParameter(userId, environmentId);
    if (isUserErrorResponse(userData)) return userData.error.message;

    const result: Record<string, any> = {
      name: userData.displayName[0].text,
    };

    userData.subParameters[0].subParameters.forEach((par) => {
      result[par.name] = {
        value: (par as any).value,
        unit: par.unitRef,
        description: par.description?.[0].text,
      };
    });

    return {
      content: [{ type: 'text', text: JSON.stringify(result) }],
    };
  } catch (err) {
    if (err instanceof Error) return err.message;
    else return 'Error: Something went wrong';
  }
}

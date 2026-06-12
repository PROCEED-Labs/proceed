import { type InferSchema } from 'xmcp';
import { toAuthorizationSchema, verifyCode } from '@/lib/mcp-utils';

import { getUserParameter } from '@/lib/data/db/machine-config';
import { isUserErrorResponse } from '@/lib/user-error';
import { getUserById } from '@/lib/data/db/iam/users';

// Define the schema for tool parameters
export const schema = toAuthorizationSchema({});

// Define tool metadata
export const metadata = {
  name: 'get-user-data',
  description: 'Gets data relevant to the user making the request.',
  annotations: {
    title: 'Get User Data',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

// Tool implementation
export default async function getUserData({ userCode }: InferSchema<typeof schema>) {
  try {
    const verification = await verifyCode(userCode);

    if (isUserErrorResponse(verification)) return `Error: ${verification.error.message}`;

    const { userId, environmentId } = verification;

    const userData = await getUserParameter(userId, environmentId);
    if (isUserErrorResponse(userData)) return userData.error.message;

    const meta = await getUserById(userId);

    if (meta.isGuest) return 'Error: Not allowed';

    const result: Record<string, any> = {
      name: userData.displayName[0].text,
      meta: {
        firstName: meta.firstName,
        lastName: meta.lastName,
        username: meta.username,
        email: meta.email || undefined,
        phoneNumber: meta.phoneNumber || undefined,
      },
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

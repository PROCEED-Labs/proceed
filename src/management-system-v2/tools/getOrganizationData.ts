import { type InferSchema } from 'xmcp';
import { toAuthorizationSchema, verifyToken } from '@/lib/mcp-utils';

import { getDeepConfigurationById } from '@/lib/data/db/machine-config';

// Define the schema for tool parameters
export const schema = toAuthorizationSchema({});

// Define tool metadata
export const metadata = {
  name: 'get-organization-info',
  description:
    'Gets data relevant to the organization referenced in the access token. This includes organization name, members and general organization and member data.',
  annotations: {
    title: 'Get Organization Info',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

// Tool implementation
export default async function getOrganizatoinData({ token }: InferSchema<typeof schema>) {
  try {
    const { environmentId, ability } = await verifyToken(token);

    const conf = await getDeepConfigurationById(environmentId, ability);

    const result: Record<string, any> = {
      name: conf.shortName.value,
      data: {},
      commonMemberData: {},
      members: [],
    };

    conf.content.forEach((entry) => {
      switch (entry.name) {
        case 'organization':
          {
            entry.subParameters[0].subParameters.forEach((dataEntry) => {
              result.data[dataEntry.name] = {
                description: dataEntry.description?.[0].text,
                value: dataEntry.value,
                unit: dataEntry.unitRef || undefined,
              };
            });
          }
          break;
        case 'identity-and-access-management':
          {
            entry.subParameters.forEach((iamEntry) => {
              switch (iamEntry.name) {
                case 'common-user-data':
                  {
                    iamEntry.subParameters.forEach((memberDataEntry) => {
                      result.commonMemberData[memberDataEntry.name] = {
                        description: memberDataEntry.description?.[0].text,
                        value: memberDataEntry.value,
                        unit: memberDataEntry.unitRef || undefined,
                      };
                    });
                  }
                  break;
                case 'user':
                  {
                    iamEntry.subParameters.forEach((member) => {
                      result.members.push({ id: member.name, name: member.displayName[0].text });
                    });
                  }
                  break;
              }
            });
          }
          break;
      }
    });

    return {
      content: [{ type: 'text', text: JSON.stringify(result) }],
    };
  } catch (err) {
    if (err instanceof Error) return err.message;
    else return 'Error: Something went wrong';
  }
}

import { type InferSchema } from 'xmcp';
import { toAuthorizationSchema, verifyToken } from '@/lib/mcp-utils';

import { getDeepConfigurationById } from '@/lib/data/db/machine-config';
import { getRolesWithMembers } from '@/lib/data/db/iam/roles';
import { asyncForEach } from '@/lib/helpers/javascriptHelpers';
import { getUserById } from '@/lib/data/db/iam/users';

// Define the schema for tool parameters
export const schema = toAuthorizationSchema({});

// Define tool metadata
export const metadata = {
  name: 'get-organization-data',
  description:
    'Gets data relevant to the organization referenced in the access token. This includes organization name, members and general organization and member data.',
  annotations: {
    title: 'Get Organization Data',
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
      roles: [],
    };

    await asyncForEach(conf.content, async (entry) => {
      switch (entry.name) {
        case 'organization':
          {
            entry.subParameters[0].subParameters.forEach((dataEntry) => {
              result.data[dataEntry.name] = {
                description: dataEntry.description?.[0].text,
                value: (dataEntry as any).value,
                unit: dataEntry.unitRef || undefined,
              };
            });
          }
          break;
        case 'identity-and-access-management':
          {
            await asyncForEach(entry.subParameters, async (iamEntry) => {
              switch (iamEntry.name) {
                case 'common-user-data':
                  {
                    iamEntry.subParameters.forEach((memberDataEntry) => {
                      result.commonMemberData[memberDataEntry.name] = {
                        description: memberDataEntry.description?.[0].text,
                        value: (memberDataEntry as any).value,
                        unit: memberDataEntry.unitRef || undefined,
                      };
                    });
                  }
                  break;
                case 'user':
                  {
                    await asyncForEach(iamEntry.subParameters, async (member) => {
                      const user = await getUserById(member.name);

                      if (user.isGuest) return;

                      result.members.push({
                        id: member.name,
                        name: member.displayName[0].text,
                        meta: {
                          firstName: user.firstName,
                          lastName: user.lastName,
                          username: user.username,
                          email: user.email || undefined,
                          phoneNumber: user.phoneNumber || undefined,
                        },
                        roles: [],
                      });
                    });
                  }
                  break;
              }
            });
          }
          break;
      }
    });

    const roles = await getRolesWithMembers(environmentId);

    roles.forEach((role) => {
      if (role.name.startsWith('@')) return;

      const r = { name: role.name, members: [] as any[] };
      result.roles.push(r);

      role.members.forEach((member) => {
        const m = result.members.find((mem: { id: string }) => mem.id === member.id);

        if (!m) return;

        m.roles.push(role.name);
        r.members.push(m.meta);
      });
    });

    return {
      content: [{ type: 'text', text: JSON.stringify(result) }],
    };
  } catch (err) {
    if (err instanceof Error) return err.message;
    else return 'Error: Something went wrong';
  }
}

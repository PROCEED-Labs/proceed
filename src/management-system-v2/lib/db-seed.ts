import z from 'zod';
import db from '@/lib/data/db';
import { addUser, getUserById, setUserPassword } from './data/db/iam/users';
import { addRoleMappings } from './data/db/iam/role-mappings';
import {
  OrganizationEnvironment,
  UserOrganizationEnvironmentInputSchema,
} from './data/environment-schema';
import { addRole, getRoleById } from './data/db/iam/roles';
import { addEnvironment, getEnvironmentById } from './data/db/iam/environments';
import { addMember, isMember } from './data/db/iam/memberships';
import { getRoleMappingByUserId } from './data/db/iam/role-mappings';
import { zodPhoneNumber } from './utils';
import { permissionIdentifiersToNumber } from './authorization/permissionHelpers';
import { ResourceType, resourceAction, resources } from './ability/caslAbility';
import { hashPassword } from './password-hashes';
import { env } from './ms-config/env-vars';
import { addSystemAdmin } from './data/db/iam/system-admins';

/* -------------------------------------------------------------------------------------------------
 * Schema + Verification
 * -----------------------------------------------------------------------------------------------*/

// TODO: optional keys -> numberFormat, dateFormat, settings
const userSchema = z.object({
  id: z.string().uuid(),
  firstName: z
    .string()
    .regex(/^[A-Za-z-\s]+$/, 'The First Name can only contain letters from a to z')
    .min(1, 'The First Name must be at least 1 character long')
    .max(35, 'The First Name cannot be longer than 35 characters'),
  lastName: z
    .string()
    .regex(/^[A-Za-z-\s]+$/, 'The Last Name can only contain letters from a to z')
    .min(1, 'The Last Name must be at least 1 character long')
    .max(35, 'The Last Name cannot be longer than 35 characters'),
  username: z
    .string()
    .regex(/^[A-Za-z-_0-9]+$/, 'The Username can only contain letters from a to z and numbers')
    .regex(/^[^\s]+$/, 'The Username cannot contain spaces')
    .min(1, 'The Username must be at least 1 character long')
    .max(35, 'The Username cannot be longer than 35 characters'),
  // TODO: password restrictions? maybe here not as it is the initial password
  initialPassword: z.string().min(1),

  // Optional fields
  phoneNumber: zodPhoneNumber().optional(),
  email: z.string().email('Invalid E-Mail address').optional(),
  profileImage: z.string().url().nullable().optional(),
});

const roleActions = z.array(z.enum(resourceAction));

type Permissions = Record<ResourceType, typeof roleActions>;
const rolePermissions: Partial<Permissions> = {};
for (const resource of resources) {
  rolePermissions[resource] = roleActions;
}

const roleSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullish().optional(),
  note: z.string().nullish().optional(),
  permissions: z.object(rolePermissions as Permissions).partial(),
  expiration: z.date().nullish().optional(),
  default: z.boolean().optional().nullable(),

  members: z.array(z.string()),
});

// TODO: optional keys ->  settings
const organizationSchema = UserOrganizationEnvironmentInputSchema.extend({
  // overwrite
  id: z.string().uuid(),
  owner: z.string(),
  contactPhoneNumber: zodPhoneNumber().optional(),
  contactEmail: z.string().email('Invalid E-Mail address').optional(),

  // Organization IAM
  members: z.array(z.string()),
  admins: z.array(z.string()).min(1, 'At least one admin is required'),
  roles: z.array(roleSchema).optional(),
});

const systemSettingsSchema = z.object({
  msAdministrators: z.array(z.string()).min(1, 'At least one MS admin is required'),
});

const seedSchema = z.object({
  version: z.string().datetime(),
  systemSettings: systemSettingsSchema,
  users: z.array(userSchema),
  organizations: z.array(organizationSchema),
});
export type DBSeed = z.infer<typeof seedSchema>;

function verifySeed(seed: DBSeed) {
  if (env.PROCEED_PUBLIC_IAM_ONLY_ONE_ORGANIZATIONAL_SPACE) {
    if (seed?.organizations.length !== 1) {
      console.error(
        'When PROCEED_PUBLIC_IAM_ONLY_ONE_ORGANIZATIONAL_SPACE is active you have to define exactly one organization in the seed file.',
      );
      process.exit(1);
    }
  }

  // verify users
  const users = new Set<string>();
  const userNames = new Set<string>();
  for (const user of seed.users) {
    if (userNames.has(user.username)) throw new Error(`Duplicate username: ${user.username}`);
    if (users.has(user.id)) throw new Error(`Duplicate user id: ${user.id}`);

    users.add(user.id);
    userNames.add(user.username);
  }

  // verify system settings
  if (seed.systemSettings) {
    for (const admin of seed.systemSettings.msAdministrators ?? []) {
      if (!userNames.has(admin)) {
        throw new Error(`System setting admin ${admin} does not exist in seed`);
      }
    }
  }

  // verify organizations
  const spaceIds = new Set<string>();
  for (const organization of seed.organizations) {
    if (spaceIds.has(organization.id))
      throw new Error(`Duplicate environment id: ${organization.id}`);
    spaceIds.add(organization.id);

    // verify that organization's users exist in seed
    const memberUsernames = new Set<string>();

    if (organization.members) {
      for (const member of organization.members) {
        if (!userNames.has(member)) throw new Error(`${member} does not exist in seed`);
        memberUsernames.add(member);
      }
    }

    for (const admin of organization.admins) {
      if (!memberUsernames.has(admin))
        throw new Error(`Admin ${admin} is not a member of the organization ${organization.name}`);
    }

    if (organization.roles) {
      for (const role of organization.roles) {
        for (const member of role.members) {
          if (!memberUsernames.has(member))
            throw new Error(
              `Role ${role.name}: ${member} is not a member of the organization ${organization.name}`,
            );
        }
      }
    }
  }
}

/* -------------------------------------------------------------------------------------------------
 * Seed to DB
 * -----------------------------------------------------------------------------------------------*/

async function writeSeedToDb(seed: DBSeed) {
  // We need to throw inside the transcation to cancel it
  await db.$transaction(async (tx) => {
    const seedVersion = new Date(seed.version);
    const seedVersionDb = await tx.seedVersion.findUnique({
      where: {
        id: 0,
      },
    });

    if (seedVersionDb && seedVersionDb.version >= seedVersion) {
      return;
    }

    if (!seedVersionDb) {
      await tx.seedVersion.create({
        data: {
          id: 0,
          version: seedVersion,
        },
      });
    } else {
      await tx.seedVersion.update({
        where: { id: 0 },
        data: { version: seedVersion },
      });
    }

    // create users
    const usernameToId = new Map<string, string>();
    for (const user of seed.users) {
      const existingUser = await getUserById(user.id);
      if (existingUser.isErr()) throw existingUser.error;

      if (existingUser.value) {
        // Use the username in seed-file instead of username in the db, as it may have changed
        usernameToId.set(user.username, existingUser.value.id);
        continue;
      }

      console.log('1');
      const newUser = await addUser({ ...user, isGuest: false, emailVerifiedOn: null }, tx);
      if (newUser.isErr()) throw newUser.error;
      console.log('2');

      const hashedPassword = await hashPassword(user.initialPassword);
      await setUserPassword(user.id, hashedPassword, tx, true);
      usernameToId.set(user.username, newUser.value.id);
    }

    // Add system administrators
    const existingAdmins = await tx.systemAdmin.findMany({
      where: {
        userId: {
          in: seed.systemSettings.msAdministrators.map(
            (userName) => usernameToId.get(userName) as string,
          ),
        },
      },
    });

    for (const adminUsername of seed.systemSettings.msAdministrators) {
      const userId = usernameToId.get(adminUsername);
      if (existingAdmins.find((u) => u.userId === userId)) continue;

      await addSystemAdmin(
        {
          userId: userId!,
          role: 'admin',
        },
        tx,
      );
    }

    // Create / Update organizations
    for (const organization of seed.organizations) {
      // create org
      const existingOrg = await getEnvironmentById(organization.id);
      if (existingOrg.isErr()) throw existingOrg.error;

      let org = existingOrg.value;

      if (!org) {
        const newOrg = await addEnvironment(
          {
            id: organization.id,
            ownerId: usernameToId.get(organization.owner)!,
            name: organization.name,
            description: organization.description,
            contactPhoneNumber: organization.contactPhoneNumber,
            contactEmail: organization.contactEmail,
            isOrganization: true,
            isActive: true,
            spaceLogo: organization.spaceLogo,
          },
          undefined,
          tx,
        );
        if (newOrg.isErr()) throw newOrg.error;

        org = newOrg.value as OrganizationEnvironment;
      }

      // Add members + get their roles
      const userRoleMappings = new Map<string, string[]>();
      for (const member of organization.members) {
        const memberId = usernameToId.get(member)!;
        if (!(await isMember(org.id, memberId, tx))) {
          await addMember(org.id, memberId, undefined, tx);
        }

        // get members role mappings
        const userRoles = await getRoleMappingByUserId(memberId, org.id, undefined, undefined, tx);
        if (userRoles.isErr()) throw userRoles.error;

        userRoleMappings.set(
          memberId,
          userRoles.value.map((role) => role.roleId),
        );
      }

      // Admin role mappings
      const adminRole = await tx.role.findFirst({
        where: {
          environmentId: org.id,
          name: '@admin',
        },
      });
      if (!adminRole) {
        throw new Error(`Consistency error: Admin role for ${organization.name} not found`);
      }

      // Admin role is created by default when the org is created
      for (const admin of organization.admins) {
        const adminId = usernameToId.get(admin)!;
        if (userRoleMappings.get(adminId)?.includes(adminRole.id)) continue;

        await addRoleMappings(
          [
            {
              userId: adminId,
              roleId: adminRole.id,
              environmentId: org.id,
            },
          ],
          undefined,
          tx,
        );
      }

      // Add roles
      // Here we go by the name of the role
      if (organization.roles) {
        for (const roleInput of organization.roles) {
          const roleMembers = roleInput.members;
          delete (roleInput as any)['members'];

          const existingRole = await getRoleById(roleInput.id, undefined, tx);
          if (existingRole.isErr()) throw existingRole.error;

          let role = existingRole.value;
          if (!role) {
            const rolePermissions: Partial<Record<ResourceType, number>> = {};
            for (const [action, permissions] of Object.entries(roleInput.permissions)) {
              rolePermissions[action as ResourceType] = permissionIdentifiersToNumber(permissions);
            }

            const newRole = await addRole(
              {
                ...roleInput,
                permissions: rolePermissions,
                environmentId: org.id,
              },
              undefined,
              tx,
            );
            if (newRole.isErr()) throw newRole.error;

            role = newRole.value;
          }

          for (const roleMember of roleMembers) {
            const roleMemberId = usernameToId.get(roleMember)!;
            if (userRoleMappings.get(roleMemberId)?.includes(role.id)) continue;

            await addRoleMappings(
              [
                {
                  userId: roleMemberId,
                  roleId: role.id,
                  environmentId: org.id,
                },
              ],
              undefined,
              tx,
            );
          }
        }
      }
    }
  });
}

/* -------------------------------------------------------------------------------------------------
 * Import Seed + Verification + Write to DB
 * -----------------------------------------------------------------------------------------------*/

/**
 * @note This function will terminate the process if the import fails.
 */
export async function importSeed() {
  let seedDbConfig: unknown | undefined;
  try {
    seedDbConfig = (await import('../seed-db-with-spaces.config')).seedDbConfig;
  } catch (_) {
    return;
  }

  try {
    const parseResult = seedSchema.safeParse(seedDbConfig);
    if (!parseResult.success) {
      let msg = '';
      for (const [variable, error] of Object.entries(parseResult.error.flatten().fieldErrors))
        msg += `- ${variable}: ${JSON.stringify(error)}\n`;

      throw new Error(`❌ Error parsing seed file\n${msg}`);
    }

    verifySeed(parseResult.data);

    await writeSeedToDb(parseResult.data);

    return parseResult.data;
  } catch (e) {
    console.error('Failed to import seed');
    console.error(e);
    process.exit(1);
  }
}

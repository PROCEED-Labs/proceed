import z from 'zod';
import { RoleInputSchema } from './data/role-schema';
import db from '@/lib/data/db';
import { addUser, getUserById } from './data/db/iam/users';
import { addRoleMappings } from './data/db/iam/role-mappings';
import {
  OrganizationEnvironment,
  UserOrganizationEnvironmentInputSchema,
  environmentSchema,
} from './data/environment-schema';
import { addRole } from './data/db/iam/roles';
import { addEnvironment, getEnvironmentById } from './data/db/iam/environments';
import { addMember, isMember } from './data/db/iam/memberships';
import { getRoleMappingByUserId } from './data/db/iam/role-mappings';
import { zodPhoneNumber } from './utils';

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

const roleSchema = RoleInputSchema.extend({
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
type Organization = z.infer<typeof organizationSchema>;

const seedSchema = z.object({
  users: z.array(userSchema),
  organizations: z.array(organizationSchema),
});
export type Seed = z.infer<typeof seedSchema>;

function verifySeed(seed: Seed) {
  // verify users
  const users = new Set<string>();
  const userNames = new Set<string>();
  for (const user of seed.users) {
    if (userNames.has(user.username)) throw new Error(`Duplicate username: ${user.username}`);
    if (users.has(user.id)) throw new Error(`Duplicate user id: ${user.id}`);

    users.add(user.id);
    userNames.add(user.username);
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

async function writeSeedToDb(seed: Seed) {
  await db.$transaction(async (tx) => {
    // create users
    // TODO: passwords
    const usernameToId = new Map<string, string>();
    for (const user of seed.users) {
      const existingUser = await getUserById(user.id);
      if (existingUser) {
        // Use the username in seed-file instead of username in the db, as it may have changed
        usernameToId.set(user.username, existingUser.id);
        continue;
      }

      const newUser = await addUser({ ...user, isGuest: false, emailVerifiedOn: null }, tx);
      usernameToId.set(user.username, newUser.id);
    }

    // Create / Update organizations
    for (const organization of seed.organizations) {
      const a = {
        ownerId: usernameToId.get(organization.owner)!,
        name: organization.name,
        description: organization.description,
        contactPhoneNumber: organization.contactPhoneNumber,
        contactEmail: organization.contactEmail,
        isOrganization: true,
        isActive: true,
      };
      environmentSchema.parse(a);

      // create org
      let org = await getEnvironmentById(organization.id);
      if (!org)
        org = (await addEnvironment(
          {
            ownerId: usernameToId.get(organization.owner)!,
            name: organization.name,
            description: organization.description,
            contactPhoneNumber: organization.contactPhoneNumber,
            contactEmail: organization.contactEmail,
            isOrganization: true,
            isActive: true,
          },
          undefined,
          tx,
        )) as OrganizationEnvironment;

      // Add members + get their roles
      const userRoleMappings = new Map<string, string[]>();
      for (const member of organization.members) {
        const memberId = usernameToId.get(member)!;
        if (!(await isMember(org.id, memberId, tx)))
          await addMember(org.id, memberId, undefined, tx);

        // get members role mappings
        const userRoles = await getRoleMappingByUserId(memberId, org.id, undefined, undefined, tx);
        userRoleMappings.set(
          memberId,
          userRoles.map((role) => role.roleName),
        );
      }

      // Admin role mappings
      const adminRole = await tx.role.findFirst({
        where: {
          environmentId: org.id,
          name: '@admin',
        },
      });
      if (!adminRole)
        throw new Error(`Consistency error: Admin role for ${organization.name} not found`);

      for (const admin of organization.admins) {
        const adminId = usernameToId.get(admin)!;
        if (userRoleMappings.get(adminId)?.includes('@admin')) continue;

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
        for (const role of organization.roles) {
          const roleMembers = role.members;
          delete (role as any)['members'];

          const newRole = await addRole(
            {
              ...role,
              environmentId: org.id,
            },
            undefined,
            tx,
          );

          for (const roleMember of roleMembers) {
            const roleMemberId = usernameToId.get(roleMember)!;
            if (userRoleMappings.get(roleMemberId)?.includes(role.name)) continue;

            await addRoleMappings(
              [
                {
                  userId: roleMemberId,
                  roleId: newRole.id,
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

import { seedDbConfig } from '@/seed-db-with-spaces.config';

export async function importSeed() {
  if (!seedDbConfig) return;

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
  } catch (e) {
    console.error('Failed to import seed');
    console.error(e);
  }
}

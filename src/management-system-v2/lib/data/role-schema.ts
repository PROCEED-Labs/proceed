import { z } from 'zod';
import { resources, ResourceType } from '../ability/caslAbility';
import { AuthenticatedUser } from './user-schema';

type Permissions = Record<ResourceType, z.ZodNumber>;
const perms: Partial<Permissions> = {};
for (const resource of resources) {
  perms[resource] = z.number();
}
export const RoleInputSchema = z.object({
  id: z.string().optional(),
  environmentId: z.string(),
  name: z.string().min(5).max(100),
  description: z.string().nullish().optional(),
  note: z.string().nullish().optional(),
  permissions: z.object(perms as Permissions).partial(),
  expiration: z.date().nullish().optional(),
  default: z.boolean().optional().nullable(),
  parentId: z.string().optional().nullable(),
});

export type RoleInput = z.infer<typeof RoleInputSchema>;

export type Role = RoleInput & {
  id: string;
  createdOn: Date;
  lastEditedOn: Date;
};

export type RoleWithMembers = Role & {
  members: Pick<AuthenticatedUser, 'id' | 'email' | 'username' | 'firstName' | 'lastName'>[];
};

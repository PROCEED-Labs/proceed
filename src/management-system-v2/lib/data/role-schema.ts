import { z } from 'zod';
import { resources, ResourceType } from '../ability/caslAbility';

type Permissions = Record<ResourceType, z.ZodNumber>;
const perms: Partial<Permissions> = {};
for (const resource of resources) {
  perms[resource] = z.number();
}
export const RoleInputSchema = z.object({
  environmentId: z.string(),
  name: z.string(),
  description: z.string().nullish().optional(),
  note: z.string().nullish().optional(),
  permissions: z.object(perms as Permissions).partial(),
  expiration: z.date().nullish().optional(),
  default: z.boolean().optional().nullable(),
  parentId: z.string().optional(),
});

export type RoleInput = z.infer<typeof RoleInputSchema>;

export type Role = RoleInput & {
  id: string;
  members: {
    userId: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  }[];
  createdOn: Date;
  lastEditedOn: Date;
};

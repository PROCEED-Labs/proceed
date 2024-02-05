import { z } from 'zod';

export const UserOrganizationEnvironmentInputSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  logoUrl: z.string().url().optional(),
});

export const OrganizationEnvironmentSchema = UserOrganizationEnvironmentInputSchema.extend({
  ownerId: z.string().readonly(),
  organization: z.literal(true).readonly(),
});

export const PersonalEnvironmentSchema = z.object({
  ownerId: z.string().readonly(),
  organization: z.literal(false).readonly(),
});

export const environmentSchema = z.union([
  OrganizationEnvironmentSchema,
  PersonalEnvironmentSchema,
]);

export type UserOrganizationEnvironmentInput = z.infer<
  typeof UserOrganizationEnvironmentInputSchema
>;
export type EnvironmentInput = z.infer<typeof environmentSchema>;
export type PersonalEnvironment = z.infer<typeof PersonalEnvironmentSchema> & {
  id: string;
};
export type OrganizationEnvironment = z.infer<typeof OrganizationEnvironmentSchema> & {
  id: string;
};
export type Environment = EnvironmentInput & { id: string };

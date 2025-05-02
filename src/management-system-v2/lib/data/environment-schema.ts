import { z } from 'zod';
import { zodPhoneNumber } from '../utils';

// TODO: add min and max constraints
export const UserOrganizationEnvironmentInputSchema = z.object({
  name: z.string().min(4, { message: 'Name must be at least 4 characters long' }),
  description: z.string().min(4, { message: 'Description must be at least 4 characters long' }),
  contactPhoneNumber: zodPhoneNumber().optional(),
  contactEmail: z.string().email('Invalid E-Mail address').optional(),
  spaceLogo: z.string().url().optional(),
});

export const OrganizationEnvironmentSchema = z.union([
  UserOrganizationEnvironmentInputSchema.extend({
    isOrganization: z.literal(true),
    isActive: z.literal(false),
  }),
  UserOrganizationEnvironmentInputSchema.extend({
    isOrganization: z.literal(true),
    isActive: z.literal(true),
    ownerId: z.string().readonly(),
  }),
]);

export const PersonalEnvironmentSchema = z.object({
  ownerId: z.string().readonly(),
  isOrganization: z.literal(false).readonly(),
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

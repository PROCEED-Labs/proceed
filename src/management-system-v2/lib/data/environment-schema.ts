import parsePhoneNumberFromString from 'libphonenumber-js';
import { z } from 'zod';

// TODO: add min and max constraints
export const UserOrganizationEnvironmentInputSchema = z.object({
  name: z.string().min(4, { message: 'Name must be at least 4 characters long' }),
  description: z.string().min(4, { message: 'Description must be at least 4 characters long' }),
  contactPhoneNumber: z.string().transform((arg, ctx) => {
    const phone = parsePhoneNumberFromString(arg, {
      defaultCountry: 'DE',
      extract: false,
    });

    if (phone && phone.isValid()) {
      return phone.number.toString();
    }

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Invalid phone number',
    });

    return z.NEVER;
  }),
  logoUrl: z.string().url().optional(),
});

export const OrganizationEnvironmentSchema = z.union([
  UserOrganizationEnvironmentInputSchema.extend({
    organization: z.literal(true),
    active: z.literal(false),
  }),
  UserOrganizationEnvironmentInputSchema.extend({
    organization: z.literal(true),
    active: z.literal(true),
    ownerId: z.string().readonly(),
  }),
]);

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

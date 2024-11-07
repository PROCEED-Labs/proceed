import { z } from 'zod';

export const AuthenticatedUserDataSchema = z.object({
  firstName: z
    .string()
    .regex(/^[A-Za-z-\s]+$/, 'The First Name can only contain letters from a to z')
    .min(1, 'The First Name must be at least 1 character long')
    .max(35, 'The First Name cannot be longer than 35 characters')
    .optional(),
  lastName: z
    .string()
    .regex(/^[A-Za-z-\s]+$/, 'The Last Name can only contain letters from a to z')
    .min(1, 'The Last Name must be at least 1 character long')
    .max(35, 'The Last Name cannot be longer than 35 characters')
    .optional(),
  username: z
    .string()
    .regex(/^[A-Za-z-_0-9]+$/, 'The Username can only contain letters from a to z and numbers')
    .regex(/^[^\s]+$/, 'The Username cannot contain spaces')
    .min(1, 'The Username must be at least 1 character long')
    .max(35, 'The Username cannot be longer than 35 characters')
    .optional(),
  image: z.string().url().nullable().optional(),
  favourites: z.array(z.string()).optional(),
});
export type AuthenticatedUserData = z.infer<typeof AuthenticatedUserDataSchema>;

export const AuthenticatedUserSchema = AuthenticatedUserDataSchema.extend({
  isGuest: z.literal(false),
  id: z.string().optional(),
  // NOTE: maybe email should be moved to user data as the user could change their email
  // TODO: email is optional because Twitter doesn't return an email for the time being,
  // once it does this type should be non-optional and the commit d34be03d9a89cd11418f4b550a04b3664ce1de71 reverted
  confluenceId: z.string().optional(),
  email: z.string().optional(),
  emailVerifiedOn: z.date().nullable(),
});
export type AuthenticatedUser = z.infer<typeof AuthenticatedUserSchema> & { id: string };

export const GuestUserSchema = z.object({
  isGuest: z.literal(true),
  id: z.string().optional(),
});
export type GuestUser = z.infer<typeof GuestUserSchema> & { id: string };

export const UserSchema = z.union([AuthenticatedUserSchema, GuestUserSchema]);
export type User = z.infer<typeof UserSchema> & { id: string };

/**
 * Accounts represent Oauth Providers that are linked to a user.
 * It is possible to have multiple oauth accounts/login for a single user.
 *
 * However, this is onlyu possible if the user is logged in,
 * goes to the login page and logs in with a different oauth provider.
 * */

export const OauthAccountSchema = z.object({
  userId: z.string(),
  provider: z.string(),
  type: z.enum(['oauth', 'email', 'credentials']),
  providerAccountId: z.string(),

  // At the time we don't store tokens
  // token_type: z.string(),
  // access_token: z.string(),
  // expires_at: z.string(),
  // refresh_token: z.string(),
  // scope: z.string(),
});
export type OauthAccount = z.infer<typeof OauthAccountSchema> & { id: string };

import { z } from 'zod';
import { WithRequired } from '../typescript-utils';

export const UserDataSchema = z.object({
  email: z.string().email(),
  image: z.string().optional(),
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
});

export const UserSchema = UserDataSchema.extend({
  id: z.string().optional(),
  oauthProvider: z.string(),
});

export type UserData = z.infer<typeof UserDataSchema>;
export type UserInput = z.infer<typeof UserSchema>;
export type User = WithRequired<UserInput, 'id'>;

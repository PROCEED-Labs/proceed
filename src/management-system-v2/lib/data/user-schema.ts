import { z } from 'zod';
import { WithRequired } from '../typescript-utils';

export const UserSchema = z.object({
  id: z.string().optional(),
  oauthProvider: z.string(),
  email: z.string().email(),
  image: z.string().optional(),
  firstName: z
    .string()
    .min(1)
    .max(35)
    .regex(/^[A-Za-z-\s]+$/, 'The First Name can only contain letters from a to z'),
  lastName: z
    .string()
    .min(1)
    .max(35)
    .regex(/^[A-Za-z-\s]+$/, 'The Last Name can only contain letters from a to z'),
  username: z
    .string()
    .min(1)
    .max(35)
    .regex(/^[A-Za-z-_0-9]+$/, 'The Username can only contain letters from a to z and numbers')
    .regex(/^[^\s]+$/, 'The Username cannot contain spaces'),
});

export type UserInput = z.infer<typeof UserSchema>;
export type User = WithRequired<UserInput, 'id'>;

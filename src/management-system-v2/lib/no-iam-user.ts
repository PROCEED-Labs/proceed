import type { User as UserDB, SystemAdmin } from '@prisma/client';
import type { addUser } from '@/lib/data/db/iam/users';
import { Session } from 'next-auth';

export const userId = 'proceed-default-no-iam-user';

export const user = {
  id: userId,
  firstName: 'Admin',
  lastName: 'Admin',
  username: 'default',
  email: null,
  phoneNumber: null,
  isGuest: false,
  emailVerifiedOn: null,
  profileImage: null,
  favourites: [],
} satisfies UserDB;

export const createUserArgs = {
  id: userId,
  firstName: user.firstName,
  lastName: user.lastName,
  username: user.username,
  emailVerifiedOn: null,
  isGuest: false,
} satisfies Parameters<typeof addUser>[0];

export const session = {
  user,
  expires: '',
  csrfToken: 'csrf-token',
} satisfies Session;

export const systemAdmin = {
  id: userId,
  userId: userId,
  role: 'admin',
  lastEditedOn: new Date(),
  createdOn: new Date(),
} satisfies SystemAdmin;

import type { addUser } from '@/lib/data/db/iam/users';
import { Session } from 'next-auth';
import { AuthenticatedUser } from './data/user-schema';

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
} as AuthenticatedUser;

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
} satisfies Session;

export const systemAdmin = {
  id: userId,
  userId: userId,
  role: 'admin',
  lastEditedOn: new Date(),
  createdOn: new Date(),
} satisfies SystemAdmin;

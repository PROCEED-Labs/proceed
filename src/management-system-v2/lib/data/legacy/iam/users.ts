import { v4 } from 'uuid';
import store from '../store.js';
import {
  User,
  UserSchema,
  AuthenticatedUserDataSchema,
  AuthenticatedUserData,
  OauthAccountSchema,
  OauthAccount,
  AuthenticatedUser,
  AuthenticatedUserSchema,
} from '../../user-schema';
import { addEnvironment } from './environments';
import { OptionalKeys } from '@/lib/typescript-utils.js';

// @ts-ignore
let firstInit = !global.usersMetaObject || !global.accountsMetaObject;

export let usersMetaObject: { [Id: string]: User } =
  // @ts-ignore
  global.usersMetaObject || (global.usersMetaObject = {});

export let accountsMetaObject: { [Id: string]: OauthAccount } =
  // @ts-ignore
  global.accountsMetaObject || (global.accountsMetaObject = {});

export function getUserById(id: string, opts?: { throwIfNotFound?: boolean }) {
  const user = usersMetaObject[id];

  if (!user && opts && opts.throwIfNotFound) throw new Error('User not found');

  return user;
}

export function getUserByEmail(email: string, opts?: { throwIfNotFound?: boolean }) {
  const user = Object.values(usersMetaObject).find((user) => !user.guest && email === user.email);

  if (!user && opts?.throwIfNotFound) throw new Error('User not found');

  return user;
}

export function addUser(inputUser: OptionalKeys<User, 'id'>) {
  const user = UserSchema.parse(inputUser);

  if (
    !user.guest &&
    Object.values(usersMetaObject).find(
      (existingUser) =>
        !existingUser.guest &&
        (existingUser.email === user.email || existingUser.username === user.username),
    )
  )
    throw new Error('User with this email or username already exists');

  if (!user.id) user.id = v4();

  if (usersMetaObject[user.id]) throw new Error('User already exists');

  addEnvironment({
    ownerId: user.id,
    organization: false,
  });

  usersMetaObject[user.id as string] = user as User;
  store.add('users', user);

  return user as User;
}

export function deleteuser(userId: string) {
  const user = usersMetaObject[userId];

  if (!user) throw new Error("User doesn't exist");

  for (const account of Object.values(accountsMetaObject)) {
    if (account.userId === userId) deleteOauthAccount(account.id);
  }

  delete usersMetaObject[userId];
  store.remove('users', userId);

  return user;
}

export function updateUser(userId: string, inputUser: Partial<AuthenticatedUser>) {
  const user = getUserById(userId, { throwIfNotFound: true });

  if (user.guest) throw new Error('Guest users cannot be updated');

  const newUserData = AuthenticatedUserSchema.partial().parse(inputUser);

  if (
    Object.values(usersMetaObject).find(
      (existingUser) =>
        !existingUser.guest &&
        existingUser.id != userId &&
        existingUser.username === newUserData.username,
    )
  )
    throw new Error('User with this email or username already exists');

  const userData = { ...user, ...newUserData };

  usersMetaObject[user.id] = userData;
  store.update('users', userId, userData);

  return user;
}

export function addOauthAccount(accountInput: Omit<OauthAccount, 'id'>) {
  const newAccount = OauthAccountSchema.parse(accountInput);

  const id = v4();

  if (accountsMetaObject[id]) throw new Error('Account already exists');

  const account = { ...newAccount, id };
  store.add('accounts', account);
  accountsMetaObject[id] = account;
}

export function deleteOauthAccount(id: string) {
  if (!accountsMetaObject[id]) throw new Error('Account not found');

  store.remove('accounts', id);
  delete accountsMetaObject[id];
}

export function getOauthAccountByProviderId(provider: string, providerAccountId: string) {
  for (const account of Object.values(accountsMetaObject)) {
    if (account.provider === provider && account.providerAccountId === providerAccountId)
      return account;
  }
}

/**
 * initializes the environments meta information objects
 */
export function init() {
  if (!firstInit) return;

  const storedUsers = store.get('users');

  // set roles store cache for quick access
  storedUsers.forEach((user: User) => (usersMetaObject[user.id] = user));

  const storedAccounts = store.get('accounts');
  storedAccounts.forEach((account: OauthAccount) => (accountsMetaObject[account.id] = account));
}
init();

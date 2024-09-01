import { v4 } from 'uuid';
import store from '../store.js';
import {
  User,
  UserSchema,
  OauthAccountSchema,
  OauthAccount,
  AuthenticatedUser,
  AuthenticatedUserSchema,
} from '../../user-schema';
import { addEnvironment, deleteEnvironment } from './environments';
import { OptionalKeys } from '@/lib/typescript-utils.js';
import { getUserOrganizationEnvironments, removeMember } from './memberships';
import { getRoleMappingByUserId } from './role-mappings';
import { getRoles } from './roles';
import { addSystemAdmin, getSystemAdmins } from './system-admins';

// @ts-ignore
let firstInit = !global.usersMetaObject || !global.accountsMetaObject;

export let usersMetaObject: { [Id: string]: User } =
  // @ts-ignore
  global.usersMetaObject || (global.usersMetaObject = {});

export let accountsMetaObject: { [Id: string]: OauthAccount } =
  // @ts-ignore
  global.accountsMetaObject || (global.accountsMetaObject = {});

export function getUsers() {
  return Object.values(usersMetaObject);
}

export async function getUserById(id: string, opts?: { throwIfNotFound?: boolean }) {
  const user = usersMetaObject[id];
  if (!user && opts?.throwIfNotFound) throw new Error('User not found');
  return user as User;
}

export async function getUserByEmail(email: string, opts?: { throwIfNotFound?: boolean }) {
  const user = Object.values(usersMetaObject).find((user) => !user.isGuest && email === user.email);
  if (!user && opts?.throwIfNotFound) throw new Error('User not found');
  return user;
}

export async function getUserByUsername(username: string, opts?: { throwIfNotFound?: boolean }) {
  const user = Object.values(usersMetaObject).find(
    (user) => !user.isGuest && user.username === username,
  );
  if (!user && opts?.throwIfNotFound) throw new Error('User not found');
  return user;
}

export async function addUser(inputUser: OptionalKeys<User, 'id'>) {
  const user = UserSchema.parse(inputUser);

  if (
    !user.isGuest &&
    ((user.username && (await getUserByUsername(user.username))) ||
      (await getUserByEmail(user.email!)))
  )
    throw new Error('User with this email or username already exists');

  if (!user.id) user.id = v4();

  if (usersMetaObject[user.id]) throw new Error('User already exists');

  addEnvironment({
    ownerId: user.id,
    isOrganization: false,
  });

  usersMetaObject[user.id as string] = user as User;
  store.add('users', user);

  // TODO: change this to a more efficient query when the
  // persistence layer is implemented
  if ((await getSystemAdmins()).length === 0)
    addSystemAdmin({
      role: 'admin',
      userId: user.id,
    });

  return user as User;
}

export class UserHasToDeleteOrganizationsError extends Error {
  conflictingOrgs: string[];

  constructor(conflictingOrgs: string[], message?: string) {
    super(message ?? 'User has to delete organizations before being deleted');
    this.name = 'UserHasToDeleteOrganizationsError';
    this.conflictingOrgs = conflictingOrgs;
  }
}

export async function deleteUser(userId: string) {
  const user = usersMetaObject[userId];
  if (!user) throw new Error("User doesn't exist");

  const userOrganizations = await getUserOrganizationEnvironments(userId);
  const orgsWithNoNextAdmin: string[] = [];
  for (const environmentId of userOrganizations) {
    const userRoles = await getRoleMappingByUserId(userId, environmentId);
    if (!userRoles.find((role) => role.roleName === '@admin')) continue;

    const adminRole = (await getRoles(environmentId)).find((role) => role.name === '@admin');
    if (!adminRole)
      throw new Error(`Consistency error: admin role of environment ${environmentId} not found`);

    if (adminRole.members.length === 1) orgsWithNoNextAdmin.push(environmentId);
  }

  if (orgsWithNoNextAdmin.length > 0)
    throw new UserHasToDeleteOrganizationsError(orgsWithNoNextAdmin);

  for (const org of userOrganizations) {
    removeMember(org, userId);
  }

  deleteEnvironment(userId);
  delete usersMetaObject[userId];
  store.remove('users', userId);

  return user;
}

export async function updateUser(userId: string, inputUser: Partial<AuthenticatedUser>) {
  const user = await getUserById(userId, { throwIfNotFound: true });
  const isGoingToBeGuest = inputUser.isGuest !== undefined ? inputUser.isGuest : user?.isGuest;

  let updatedUser: User;
  if (isGoingToBeGuest) {
    updatedUser = {
      id: user!.id,
      isGuest: true,
    };
  } else {
    const newUserData = AuthenticatedUserSchema.partial().parse(inputUser);

    if (newUserData.email) {
      const existingUser = await getUserByEmail(newUserData.email);

      if (existingUser && existingUser.id !== userId)
        throw new Error('User with this email or username already exists');
    }

    updatedUser = { ...(user as AuthenticatedUser), ...newUserData };

    // TODO: change this to a more efficient query when the
    // persistence layer is implemented
    if (!inputUser.isGuest && (await getSystemAdmins()).length === 0)
      addSystemAdmin({
        role: 'admin',
        userId: user!.id,
      });
  }

  usersMetaObject[user!.id] = updatedUser;
  store.update('users', userId, updatedUser);

  return user;
}

export async function addOauthAccount(accountInput: Omit<OauthAccount, 'id'>) {
  const newAccount = OauthAccountSchema.parse(accountInput);

  const user = await getUserById(newAccount.userId);
  if (!user) throw new Error('User not found');
  if (user.isGuest) throw new Error('Guest users cannot have oauth accounts');

  const id = v4();
  const account = { ...newAccount, id };

  store.add('accounts', account);
  accountsMetaObject[id] = account;
}

export async function deleteOauthAccount(id: string) {
  if (!accountsMetaObject[id]) throw new Error('Account not found');

  store.remove('accounts', id);
  delete accountsMetaObject[id];
}

export async function getOauthAccountByProviderId(provider: string, providerAccountId: string) {
  for (const account of Object.values(accountsMetaObject)) {
    if (account.provider === provider && account.providerAccountId === providerAccountId)
      return account;
  }
}

let inited = false;

/**
 * Initializes the environments meta information objects.
 */
export function init() {
  if (!firstInit || inited) return;
  inited = true;

  const storedUsers = store.get('users');
  storedUsers.forEach((user: User) => (usersMetaObject[user.id] = user));

  const storedAccounts = store.get('accounts');
  storedAccounts.forEach((account: OauthAccount) => (accountsMetaObject[account.id] = account));
}
init();

import { v4 } from 'uuid';
import store from '../store.js';
import Ability, { UnauthorizedError } from '@/lib/ability/abilityHelper';
import { toCaslResource } from '@/lib/ability/caslAbility';
import { User, UserData, UserDataSchema, UserInput, UserSchema } from '../../user-schema';
import { addEnvironment } from './environments';

// @ts-ignore
let firstInit = !global.environmentMetaObject;

export let usersMetaObject: { [Id: string]: User } =
  // @ts-ignore
  global.usersMetaObject || (global.usersMetaObject = {});

export function getUsers(ability?: Ability) {
  const users = Object.values(usersMetaObject);

  return ability ? ability.filter('view', 'User', users) : users;
}

export function getUserById(id: string, ability?: Ability, opts?: { throwIfNotFound?: boolean }) {
  const user = usersMetaObject[id];

  if (!user && opts && opts.throwIfNotFound) throw new Error('User not found');

  if (
    ability &&
    !ability?.can('view', toCaslResource('User', user), { environmentId: ability.environmentId })
  )
    throw new UnauthorizedError();

  return user;
}

export function addUser(inputUser: UserInput, ability?: Ability) {
  const user = UserSchema.parse(inputUser);

  if (
    ability &&
    !ability.can('create', toCaslResource('User', user), { environmentId: ability.environmentId })
  )
    throw new UnauthorizedError();

  if (
    Object.values(usersMetaObject).find(
      ({ email, username }) => email === user.email || username === user.username,
    )
  )
    throw new Error('User with this email or username already exists');

  if (!user.id) user.id = `${user.oauthProvider}:${v4()}`;

  if (usersMetaObject[user.id]) throw new Error('User already exists');

  addEnvironment({
    ownerId: user.id,
    organization: false,
  });

  usersMetaObject[user.id as string] = user as User;
  store.add('users', user);

  return user;
}

export function deleteuser(userId: string, ability?: Ability) {
  const user = usersMetaObject[userId];

  if (
    ability &&
    !ability.can('delete', toCaslResource('User', user), { environmentId: ability.environmentId })
  )
    throw new UnauthorizedError();

  if (!user) throw new Error("User doesn't exist");

  delete usersMetaObject[userId];
  store.remove('users', userId);

  return user;
}

export function updateUser(userId: string, inputUser: UserData, ability?: Ability) {
  const newUserData = UserDataSchema.partial().parse(inputUser);

  const user = getUserById(userId, undefined, { throwIfNotFound: true });

  if (
    ability &&
    !ability.can('update', toCaslResource('User', user), { environmentId: ability.environmentId })
  )
    throw new UnauthorizedError();

  if (
    Object.values(usersMetaObject).find(
      ({ email, username, id }) =>
        id != userId && (email === userData.email || username === userData.username),
    )
  )
    throw new Error('User with this email or username already exists');

  const userData = { ...user, ...newUserData };

  usersMetaObject[user.id as string] = userData;
  store.update('users', userId, userData);

  return user;
}

/**
 * initializes the environments meta information objects
 */
export function init() {
  if (!firstInit) return;

  const storedUsers = store.get('users');

  // set roles store cache for quick access
  storedUsers.forEach((user: User) => (usersMetaObject[user.id] = user));
}
init();

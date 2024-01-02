import { v4 } from 'uuid';
import store from '../store.js';
import Ability, { UnauthorizedError } from '@/lib/ability/abilityHelper';
import { toCaslResource } from '@/lib/ability/caslAbility';
import { z } from 'zod';
import { WithRequired } from '@/lib/typescript-utils.js';

// @ts-ignore
let firstInit = !global.environmentMetaObject;

const UserSchema = z.object({
  id: z.string().optional(),
  oauthProvider: z.string(),
  email: z.string(),
  image: z.string().optional(),
  firstName: z.string(),
  lastName: z.string(),
  username: z.string(),
});

type UserInput = z.infer<typeof UserSchema>;
export type User = WithRequired<UserInput, 'id'>;

export let usersMetaObject: { [Id: string]: User } =
  // @ts-ignore
  global.usersMetaObject || (global.usersMetaObject = {});

export function getUsers(ability?: Ability) {
  const users = Object.values(usersMetaObject);

  return ability ? ability.filter('view', 'User', users) : users;
}

export function getUserById(id: string, ability?: Ability) {
  const user = usersMetaObject[id];

  if (ability && !ability?.can('view', toCaslResource('User', user))) throw new UnauthorizedError();

  return user;
}

export function addUser(inputUser: UserInput, ability?: Ability) {
  const user = UserSchema.parse(inputUser);

  if (ability && !ability.can('create', toCaslResource('User', user)))
    throw new UnauthorizedError();

  if (!user.id) user.id = `${user.oauthProvider}:${v4()}`;

  if (usersMetaObject[user.id]) throw new Error('User already exists');

  usersMetaObject[user.id as string] = user as User;
  store.add('users', user);

  return user;
}

export function deleteuser(userId: string, ability?: Ability) {
  const user = usersMetaObject[userId];

  if (ability && !ability.can('delete', toCaslResource('User', user)))
    throw new UnauthorizedError();

  if (!user) throw new Error("User doesn't exist");

  delete usersMetaObject[userId];
  store.remove('users', userId);

  return user;
}

/**
 * initializes the environments meta information objects
 */
export function init() {
  if (!firstInit) return;

  const storedUsers = store.get('users');

  // TODO: user migrations

  // set roles store cache for quick access
  storedUsers.forEach((user: User) => (usersMetaObject[user.id] = user));
}
init();

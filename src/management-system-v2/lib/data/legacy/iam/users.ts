import { v4 } from 'uuid';
import store from '../store.js';
import { User, UserData, UserDataSchema, CreateUserInput, UserSchema } from '../../user-schema';
import { addEnvironment } from './environments';

// @ts-ignore
let firstInit = !global.environmentMetaObject;

export let usersMetaObject: { [Id: string]: User } =
  // @ts-ignore
  global.usersMetaObject || (global.usersMetaObject = {});

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

export function addUser(inputUser: CreateUserInput) {
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

  if (!user.id) user.id = `${user.oauthProvider}:${v4()}`;

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

  delete usersMetaObject[userId];
  store.remove('users', userId);

  return user;
}

export function updateUser(userId: string, inputUser: UserData) {
  const user = getUserById(userId, { throwIfNotFound: true });

  if (user.guest) throw new Error('Guest users cannot be updated');

  const newUserData = UserDataSchema.partial().parse(inputUser);

  if (
    Object.values(usersMetaObject).find(
      (existingUser) =>
        !existingUser.guest &&
        existingUser.id != userId &&
        (existingUser.email === userData.email || existingUser.username === userData.username),
    )
  )
    throw new Error('User with this email or username already exists');

  const userData = { ...user, ...newUserData };

  usersMetaObject[user.id] = userData;
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

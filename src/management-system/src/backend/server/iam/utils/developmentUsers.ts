import url from 'url';
import requestResource from '../rest-api/index.js';
import { addRoleMapping } from '../../../shared-electron-server/data/iam/role-mappings.js';
import { getRoles } from '../../../shared-electron-server/data/iam/roles.js';
import { client } from '../authentication/client.js';
import { config } from './config.js';

type User = {
  given_name: string;
  family_name: string;
  name: string;
  username: string;
  email: string;
  password: string;
};

async function createUser(user: User, role?: any) {
  let userData: any;

  // different user representations for identity providers
  if (url.parse(client.issuer.issuer).hostname.match('\\.auth0\\.com$')) {
    userData = user;
    userData.connection = config.tenant;
  } else {
    userData = {
      firstName: user.username,
      lastName: user.family_name,
      username: user.username,
      email: user.email,
      password: user.password,
    };
  }

  // create user
  let newUser: any;
  try {
    const newUserId = await requestResource(
      `/users`,
      {
        method: 'POST',
        body: user,
      },
      config,
    );

    if (newUserId) {
      // request user from keycloak before adding role mapping, because keycloak only returns user id
      if (!url.parse(client.issuer.issuer).hostname.match('\\.auth0\\.com$')) {
        // @ts-ignore
        newUser = await requestResource(`/users/${newUserId}`);
      }
    } else {
      throw new Error('Failed to create new user.');
    }
  } catch (e) {
    // 409 means that the user already exists;
    if (e.status != 409) throw e;

    // @ts-ignore
    const users = await requestResource(`/users`);
    newUser = users.find((foundUser: any) => foundUser.username === user.username);

    if (!newUser) throw new Error('Failed to fetch existing user.');
  }

  if (!role) return;

  if (role.members.find((member: any) => member.userId === newUser.user_id || newUser.id)) return;

  try {
    await addRoleMapping([
      {
        userId: newUser.user_id || newUser.id,
        roleId: role.id,
        username: newUser.username,
        firstName: newUser.given_name || newUser.firstName,
        lastName: newUser.family_name || newUser.lastName,
        email: newUser.email,
      },
    ]);
  } catch (e) {
    throw e;
  }
}

export async function createDevelopmentUsers() {
  const roles = await getRoles();

  const processAdminRole = roles.find((role) => role.name === '@process_admin');

  await createUser(
    {
      given_name: 'John',
      family_name: 'Doe',
      name: 'John Doe',
      username: 'johndoe',
      email: 'johndoe@proceed-labs.org',
      password: 'JohnDoe2023!',
    },
    processAdminRole,
  );
}

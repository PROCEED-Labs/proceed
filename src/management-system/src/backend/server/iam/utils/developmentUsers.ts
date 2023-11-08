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

function addRoleMappingForUser(user: any, role: any) {
  if (
    role.members.find((member: any) => member.userId === user.user_id || member.user_id == user.id)
  )
    return;

  try {
    addRoleMapping([
      {
        userId: user.user_id || user.id,
        roleId: role.id,
        username: user.username,
        firstName: user.given_name || user.firstName,
        lastName: user.family_name || user.lastName,
        email: user.email,
      },
    ]);
  } catch (e) {
    throw e;
  }
}

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

  if (role) addRoleMappingForUser(newUser, role);
}

export async function createDevelopmentUsers() {
  const roles = await getRoles();

  const processAdminRole = roles.find((role) => role.name === '@process_admin');
  const adminRole = roles.find((role) => role.name === '@admin');

  if (process.env.API_ONLY) {
    addRoleMappingForUser(
      {
        username: 'johndoe',
        firstName: 'John',
        lastName: 'Doe',
        email: 'johndoe@proceed-labs.org',
        id: 'development-id|johndoe',
      },
      processAdminRole,
    );

    addRoleMappingForUser(
      {
        username: 'admin',
        firstName: 'Admin',
        lastName: 'Admin',
        email: 'admin@proceed-labs.org',
        id: 'development-id|admin',
      },
      adminRole,
    );
  } else {
    await createUser(
      {
        given_name: 'John',
        family_name: 'Doe',
        name: 'John Doe',
        username: 'johndoe',
        email: 'johndoe@proceed-labs.org',
        password: 'JohnDoe1!',
      },
      processAdminRole,
    );
  }
}

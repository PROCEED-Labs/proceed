import url from 'url';
import requestResource from '../rest-api/index.js';
import { addRoleMapping } from '../../../shared-electron-server/data/iam/role-mappings.js';
import { getRoles } from '../../../shared-electron-server/data/iam/roles.js';
import { client } from '../authentication/client.js';
import { config } from './config.js';

/**
 * initially migrates data to iam related stores and creates admin user if not exists
 *
 * @param {Object} adminRole - object of admin role from role store
 * @param {Object} config - the config object of the ms
 */
export const createAdminUser = async () => {
  const roles = await getRoles();
  const adminRole = roles.find((role) => role.name === '@admin');
  if (adminRole.members.length === 0) {
    let user;

    const { adminUsername, adminEmail, adminPassword } = config;
    // different user representations for identity providers
    if (url.parse(client.issuer.issuer).hostname.match('\\.auth0\\.com$')) {
      user = {
        given_name: 'admin',
        family_name: 'admin',
        name: 'admin admin',
        username: adminUsername,
        connection: config.tenant,
        email: adminEmail,
        password: adminPassword,
      };
    } else {
      user = {
        firstName: 'admin',
        lastName: 'admin',
        username: adminUsername,
        email: adminEmail,
        password: adminPassword,
      };
    }

    // create user
    try {
      let newUser = await requestResource(`/users`, {
        method: 'POST',
        body: user,
      });

      if (newUser) {
        // request user from keycloak before adding role mapping, because keycloak only returns user id
        if (!url.parse(client.issuer.issuer).hostname.match('\\.auth0\\.com$')) {
          newUser = await requestResource(`/users/${newUser}`);
        }
        await addRoleMapping([
          {
            userId: newUser.user_id || newUser.id,
            roleId: adminRole.id,
            username: newUser.username,
            firstName: newUser.given_name || newUser.firstName,
            lastName: newUser.family_name || newUser.lastName,
            email: newUser.email,
          },
        ]);
      }
    } catch (e) {
      // if admin user already exists
      if (e.status == 409) {
        try {
          const users = await requestResource(`/users`);
          const adminUser = users.find((user) => user.username === adminUsername);
          if (adminUser) {
            await addRoleMapping([
              {
                userId: adminUser.user_id || adminUser.id,
                roleId: adminRole.id,
                username: adminUser.username,
                firstName: adminUser.given_name || adminUser.firstName,
                lastName: adminUser.family_name || adminUser.lastName,
                email: adminUser.email,
              },
            ]);
          }
        } catch (e) {
          throw new Error('Unable to create or add admin user!');
        }
      }
    }
  }
};

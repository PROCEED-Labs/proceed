import express from 'express';
import requestResource from '../index.js';
import { validateUser } from '../../middleware/inputValidations.js';
import { ensureCleanRoleMappings } from '../../utils/roleMappings.js';
import { isAllowed, isAuthenticated } from '../../middleware/authorization.js';
import { config } from '../../../iam/utils/config.js';
import {
  PERMISSION_CREATE,
  PERMISSION_UPDATE,
  PERMISSION_DELETE,
  PERMISSION_MANAGE,
  PERMISSION_MANAGE_PASSWORD,
} from '../../../../../shared-frontend-backend/constants/index.js';

// some userinfo endpoints are not returning standardized fields, so we have to make a standard for the MS
const standardizeUser = (user) => {
  if (user) {
    if (user.family_name) {
      user.lastName = user.family_name;
      delete user.family_name;
    }
    if (user.given_name) {
      user.firstName = user.given_name;
      delete user.given_name;
    }
    if (user.preferred_username) {
      user.username = user.preferred_username;
      delete user.preferred_username;
    }
    if (user.user_id) {
      user.id = user.user_id;
      delete user.user_id;
    }
    if (user.sub) {
      user.id = user.sub;
      delete user.sub;
    }
  }

  return user;
};

const userRouter = express.Router();

/**
 * get all users from auth0
 * @returns {Array} - array of user representations
 */
userRouter.get('/', isAuthenticated(), async (req, res) => {
  try {
    const users = await requestResource(
      `/users?q=identities.connection:${config.tenant}`,
      undefined,
      config
    );
    if (users.length === 0) {
      return res.status(204).json([]);
    }
    return res.status(200).json(
      users.map(
        ({
          created_at,
          email,
          email_verified,
          family_name,
          given_name,
          name,
          picture,
          updated_at,
          user_id,
          username,
          blocked,
        }) =>
          standardizeUser({
            created_at,
            email,
            email_verified,
            family_name,
            given_name,
            name,
            picture,
            updated_at,
            user_id,
            username,
            blocked,
          })
      )
    );
  } catch (e) {
    return res.status(400).json({ error: e.toString() });
  }
});

/**
 * get the detailled user representation from auth0
 *
 * @param {String} id - the id of the user from auth0 as path param
 * @returns {Object} - user representation
 */
userRouter.get('/:id', isAuthenticated(), async (req, res) => {
  const { id } = req.params;
  if (id) {
    try {
      const {
        created_at,
        email,
        email_verified,
        family_name,
        given_name,
        name,
        picture,
        updated_at,
        user_id,
        username,
        blocked,
      } = await requestResource(`/users/${id}`, undefined, config);
      return res.status(200).json({
        created_at,
        email,
        email_verified,
        family_name,
        given_name,
        name,
        picture,
        updated_at,
        user_id,
        username,
        blocked,
      });
    } catch (e) {
      return res.status(400).json({ error: e.toString() });
    }
  } else {
    return res.status(400).json('Missing parameter id!');
  }
});

/**
 * add a new user to auth0
 *
 * @param {Object} req.body - representation of a user in the request body
 * @returns {String} - object of new user
 */
userRouter.post(
  '/',
  validateUser,
  isAllowed([PERMISSION_CREATE, PERMISSION_MANAGE], 'User'),
  async (req, res) => {
    const user = req.body;
    user.given_name = user.firstName[0].toUpperCase() + user.firstName.slice(1); //ensure capital names
    user.family_name = user.lastName[0].toUpperCase() + user.lastName.slice(1); //ensure capital names
    user.name = user.given_name + ' ' + user.family_name;
    delete user.firstName;
    delete user.lastName;
    user.connection = config.tenant; // set database connection for auth0
    if (user) {
      try {
        const newUser = await requestResource(
          `/users`,
          {
            method: 'POST',
            body: user,
          },
          config
        );
        if (newUser) {
          return res.status(201).json(newUser);
        } else {
          return res.status(400).json('Something went wrong');
        }
      } catch (e) {
        return res.status(400).json({ error: e.toString() });
      }
    } else {
      return res
        .status(400)
        .json('Missing parameter user and/or missing temporary password for user');
    }
  }
);

/**
 * update password for a user from keycloak
 *
 * @param {String} id - the id of the user from keycloak as path param
 * @param {Object} req.body - contains the new password for the user
 * @returns {String} - id of updated user
 */
userRouter.put(
  '/:id/update-password',
  isAllowed(PERMISSION_MANAGE_PASSWORD, 'User'),
  async (req, res) => {
    const { password } = req.body;
    const { id } = req.params;
    if (id && password) {
      try {
        await requestResource(
          `/users/${id}`,
          {
            method: 'PATCH',
            body: { password },
          },
          config
        );
        return res.status(201).json(id);
      } catch (e) {
        return res.status(400).json({ error: e.toString() });
      }
    } else {
      return res.status(400).json('Missing parameter id and/or password');
    }
  }
);

/**
 * update a specific user
 *
 * @param {String} id - the id of the user from auth0 as path param
 * @param {Object} req.body - updated representation of a user from auth0 in the request body
 * @returns {String} - id of updated user
 */
userRouter.put(
  '/:id',
  validateUser,
  isAllowed([PERMISSION_UPDATE, PERMISSION_MANAGE], 'User'),
  async (req, res) => {
    const { email, username, lastName, firstName } = req.body;
    const userWithEmail = { email, given_name: firstName, family_name: lastName };
    const { id } = req.params;
    if (id && userWithEmail && username) {
      try {
        // auth0 cannot adjust username and email in one api request and therefore we need to make 2 api requests
        await requestResource(
          `/users/${id}`,
          {
            method: 'PATCH',
            body: userWithEmail,
          },
          config
        );
        await requestResource(
          `/users/${id}`,
          {
            method: 'PATCH',
            body: { username },
          },
          config
        );
        return res.status(204).end();
      } catch (e) {
        return res.status(400).json({ error: e.toString() });
      }
    } else {
      return res.status(400).json('Missing parameter id and/or user');
    }
  }
);

/**
 * delete a user from auth0
 *
 * @param {String} id - the id of the user from auth0 as path param
 */
userRouter.delete(
  '/:id',
  isAllowed([PERMISSION_DELETE, PERMISSION_MANAGE], 'User'),
  async (req, res) => {
    const { id } = req.params;
    if (id) {
      try {
        await requestResource(
          `/users/${id}`,
          {
            method: 'DELETE',
          },
          config
        );
        res.status(204).end();
        await ensureCleanRoleMappings(id);
      } catch (e) {
        return res.status(400).json({ error: e.toString() });
      }
    } else {
      return res.status(400).json('Missing parameter id');
    }
  }
);

export default userRouter;

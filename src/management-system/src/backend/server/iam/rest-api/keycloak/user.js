import express from 'express';
import requestResource from '../index.js';
import { validateUser } from '../../middleware/inputValidations.js';
import { ensureCleanRoleMappings } from '../../utils/roleMappings.js';
import { isAllowed, isAuthenticated } from '../../middleware/authorization';
import { toCaslResource } from '../../authorization/caslRules';
import Ability from '../../authorization/abilityHelper';

const userRouter = express.Router();

/**
 * get all users from keycloak authorization server
 * @returns {Array} - array of user representations https://www.keycloak.org/docs-api/5.0/rest-api/index.html#_userrepresentation
 */
userRouter.get('/', isAuthenticated(), async (req, res) => {
  try {
    const users = await requestResource('/users');
    if (users.length === 0) {
      return res.status(204).json([]);
    }
    return res.status(200).json(
      users.map((user) => {
        const { id, username, firstName, lastName, email, attributes } = user;
        return { id, username, firstName, lastName, email, attributes, groups: [], roles: [] };
      })
    );
  } catch (e) {
    return res.status(400).json({ error: e.toString() });
  }
});

/**
 * get the detailled user representation from keycloak
 *
 * @param {String} id - the id of the user from keycloak as path param
 * @returns {Object} - user representation https://www.keycloak.org/docs-api/5.0/rest-api/index.html#_userrepresentation
 */
userRouter.get('/:id', isAuthenticated(), async (req, res) => {
  const { id } = req.params;
  if (id) {
    try {
      const user = await requestResource(`/users/${id}`);
      const { username, firstName, lastName, email, attributes } = user;
      return res.status(200).json({
        id: user.id,
        username,
        firstName,
        lastName,
        email,
        attributes,
      });
    } catch (e) {
      return res.status(400).json({ error: e.toString() });
    }
  } else {
    return res.status(400).json('Missing parameter id');
  }
});

/**
 * add a new user to the realm
 *
 * @param {Object} req.body - representation of a user in the request body https://www.keycloak.org/docs-api/5.0/rest-api/index.html#_userrepresentation
 * @returns {String} - id of created user
 */
userRouter.post('/', validateUser, isAllowed('create', 'User'), async (req, res) => {
  const user = req.body;
  const password = user.password;
  delete user.password;
  user.firstName = user.firstName[0].toUpperCase() + user.firstName.slice(1); //ensure capital names
  user.lastName = user.lastName[0].toUpperCase() + user.lastName.slice(1); //ensure capital names

  /** @type {Ability} */
  const userAbility = req.userAbility;

  if (!userAbility.can('create', toCaslResource('User', user)))
    return res.status(403).send('Forbidden.');

  if (user && password) {
    try {
      const id = await requestResource(`/users`, {
        method: 'POST',
        body: user,
        returnIdOfLocationHeader: true,
      });
      if (id) {
        await requestResource(`/users/${id}/reset-password`, {
          method: 'PUT',
          body: { value: password },
        });
        return res.status(201).json(id);
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
});

/**
 * update password for a user from keycloak
 *
 * @param {String} id - the id of the user from keycloak as path param
 * @param {Object} req.body - contains the new password for the user
 * @returns {String} - id of updated user
 */
userRouter.put('/:id/update-password', isAllowed('update', 'User'), async (req, res) => {
  const { password } = req.body;
  const { id } = req.params;

  /** @type {Ability} */
  const userAbility = req.userAbility;

  if (!userAbility.can('update', toCaslResource('User', { id }), 'password'))
    return res.status(403).send('Forbidden.');

  if (id && password) {
    try {
      await requestResource(`/users/${id}/reset-password`, {
        method: 'PUT',
        body: { value: password },
      });
      return res.status(201).json(id);
    } catch (e) {
      return res.status(400).json({ error: e.toString() });
    }
  } else {
    return res.status(400).json('Missing parameter id and/or password');
  }
});

/**
 * update a specific user from keycloak
 *
 * @param {String} id - the id of the user from keycloak as path param
 * @param {Object} req.body - updated representation of a user from keycloak in the request body https://www.keycloak.org/docs-api/5.0/rest-api/index.html#_userrepresentation
 * @returns {String} - id of updated user
 */
userRouter.put('/:id', validateUser, isAllowed('update', 'User'), async (req, res) => {
  const user = req.body;
  const { id } = req.params;
  if (id && user) {
    try {
      /** @type {Ability} */
      const userAbility = req.userAbility;

      if (!userAbility.checkInputFields(toCaslResource('User', { id }), 'update', user))
        return res.status(403).send('Forbidden.');

      await requestResource(`/users/${id}`, {
        method: 'PUT',
        body: user,
      });
      return res.status(204).end();
    } catch (e) {
      return res.status(400).json({ error: e.toString() });
    }
  } else {
    return res.status(400).json('Missing parameter id and/or user');
  }
});

/**
 * delete a user from keycloak
 *
 * @param {String} id - the id of the user from keycloak in the body
 * @returns {String} - id of deleted user
 */
userRouter.delete('/:id', isAllowed('delete', 'User'), async (req, res) => {
  const { id } = req.params;
  if (id) {
    try {
      /** @type {Ability} */
      const userAbility = req.userAbility;

      if (!userAbility.can('delete', toCaslResource('User', { id })))
        return res.status(403).send('Forbidden.');

      await requestResource(`/users/${id}`, {
        method: 'DELETE',
      });
      res.status(204).end();
      await ensureCleanRoleMappings(id);
    } catch (e) {
      return res.status(400).json({ error: e.toString() });
    }
  } else {
    return res.status(400).json('Missing parameter id');
  }
});

export default userRouter;

import express from 'express';
import {
  addRoleMapping,
  deleteRoleMapping,
  getRoleMappings,
  getRoleMappingByUserId,
} from '../../../shared-electron-server/data/iam/role-mappings.js';
import { abilityCacheDeleteKey, isAllowed } from '../middleware/authorization';
import Ability from '../authorization/abilityHelper';
import { toCaslResource } from '../authorization/caslRules';

const roleMappingsRouter = express.Router();

/**
 * get role mappings of a user
 *
 * @param {String} req.params - the userId of the user as a path param
 * @returns {Array} - role mappings of user
 */
roleMappingsRouter.get('/users/:userId', isAllowed('view', 'RoleMapping'), async (req, res) => {
  const { userId } = req.params;
  if (userId) {
    try {
      const roleMappings = await getRoleMappingByUserId(userId);
      if (roleMappings.length === 0) return res.status(204).json([]);

      /** @type {Ability} */
      const userAbility = req.userAbility;

      return res.status(200).json(userAbility.filter('view', 'RoleMapping', roleMappings));
    } catch (e) {
      return res.status(400).json({ error: e.toString() });
    }
  } else {
    return res.status(400).json('Missing parameter userId');
  }
});

/**
 * get all role mappings
 *
 * @returns {Array} - role mappings
 */
roleMappingsRouter.get('/', isAllowed('manage-roles', 'RoleMapping'), async (req, res) => {
  try {
    const roleMappings = await getRoleMappings();
    if (roleMappings.length === 0) return res.status(204).json([]);

    /** @type {Ability} */
    const userAbility = req.userAbility;

    const allowedRoleMappings = userAbility.filter('view', 'RoleMapping', roleMappings);

    return res.status(200).json(allowedRoleMappings);
  } catch (e) {
    return res.status(400).json({ error: e.toString() });
  }
});

/**
 * add a user role mapping
 *
 * @param {String} req.body - roleMapping object
 * @returns {String} - name of created role
 */
roleMappingsRouter.post('/', isAllowed('create', 'RoleMapping'), async (req, res) => {
  const roleMappings = req.body;
  if (roleMappings) {
    try {
      /** @type {Ability} */
      const userAbility = req.userAbility;

      const allowedRoleMappings = userAbility.filter('create', 'RoleMapping', roleMappings);

      await addRoleMapping(allowedRoleMappings);

      for (const roleMapping of allowedRoleMappings) {
        abilityCacheDeleteKey(roleMapping.userId);
      }

      res.status(201).end();
    } catch (e) {
      if (e.message === 'Role not found') return res.status(404).json({ error: e.toString() });
      return res.status(400).json({ error: e.toString() });
    }
  } else {
    return res.status(400).json('Missing body');
  }
});

/**
 * delete a user role mapping
 *
 * @param {String} req.params - userId and roleId in path params
 */
roleMappingsRouter.delete(
  '/users/:userId/roles/:roleId',
  isAllowed('delete', 'RoleMapping'),
  async (req, res) => {
    const { userId, roleId } = req.params;
    if (userId && roleId) {
      try {
        /** @type {Ability} */
        const userAbility = req.userAbility;

        const roleMapping = getRoleMappingByUserId(userId).find(
          (roleMapping) => roleMapping.roleId === roleId
        );

        if (!userAbility.can('delete', toCaslResource('RoleMapping', roleMapping)))
          return res.status(403).send('Forbidden.');

        await deleteRoleMapping(userId, roleId);

        abilityCacheDeleteKey(userId);

        return res.status(204).end();
      } catch (e) {
        if (e.message === 'Mapping not found') return res.status(404).json({ error: e.toString() });
        return res.status(400).json({ error: e.toString() });
      }
    } else {
      return res.status(400).json('Missing parameters userId and/or roleId');
    }
  }
);

export default roleMappingsRouter;

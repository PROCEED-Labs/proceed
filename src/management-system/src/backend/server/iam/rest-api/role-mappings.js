import express from 'express';
import {
  addRoleMapping,
  deleteRoleMapping,
  getRoleMappings,
  getRoleMappingByUserId,
} from '../../../shared-electron-server/data/iam/role-mappings.js';
import { isAllowed } from '../middleware/authorization.js';
import { PERMISSION_MANAGE_ROLES } from '../../../../shared-frontend-backend/constants/index.js';

const roleMappingsRouter = express.Router();

/**
 * get role mappings of a user
 *
 * @param {String} req.params - the userId of the user as a path param
 * @returns {Array} - role mappings of user
 */
roleMappingsRouter.get(
  '/users/:userId',
  isAllowed(PERMISSION_MANAGE_ROLES, 'User'),
  async (req, res) => {
    const { userId } = req.params;
    if (userId) {
      try {
        const roleMappings = await getRoleMappingByUserId(userId);
        if (roleMappings.length === 0) return res.status(204).json([]);
        return res.status(200).json(roleMappings);
      } catch (e) {
        return res.status(400).json({ error: e.toString() });
      }
    } else {
      return res.status(400).json('Missing parameter userId');
    }
  }
);

/**
 * get all role mappings
 *
 * @returns {Array} - role mappings
 */
roleMappingsRouter.get('/', isAllowed(PERMISSION_MANAGE_ROLES, 'User'), async (req, res) => {
  try {
    const roleMappings = await getRoleMappings();
    if (roleMappings.length === 0) return res.status(204).json([]);
    return res.status(200).json(roleMappings);
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
roleMappingsRouter.post(
  '/',
  isAllowed(PERMISSION_MANAGE_ROLES, 'User', { includeBody: true }),
  async (req, res) => {
    const roleMappings = req.body;
    if (roleMappings) {
      try {
        await addRoleMapping(roleMappings);
        return res.status(201).end();
      } catch (e) {
        if (e.message === 'Role not found') return res.status(404).json({ error: e.toString() });
        return res.status(400).json({ error: e.toString() });
      }
    } else {
      return res.status(400).json('Missing body');
    }
  }
);

/**
 * delete a user role mapping
 *
 * @param {String} req.params - userId and roleId in path params
 */
roleMappingsRouter.delete(
  '/users/:userId/roles/:roleId',
  isAllowed(PERMISSION_MANAGE_ROLES, 'User'),
  async (req, res) => {
    const { userId, roleId } = req.params;
    if (userId && roleId) {
      try {
        await deleteRoleMapping(userId, roleId);
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

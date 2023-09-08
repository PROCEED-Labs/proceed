import express from 'express';
import {
  getRoleById,
  getRoles,
  addRole,
  updateRole,
  deleteRole,
} from '../../../shared-electron-server/data/iam/roles.js';
import { validateRole } from '../middleware/inputValidations.js';
import { isAllowed, isAuthenticated } from '../middleware/authorization.js';
import {
  PERMISSION_CREATE,
  PERMISSION_UPDATE,
  PERMISSION_DELETE,
  PERMISSION_MANAGE,
} from '../../../../shared-frontend-backend/constants/index.js';
import { ensureOpaSync } from '../opa/opa-client.js';

const rolesRouter = express.Router();

/**
 * get role by id
 *
 * @param {String} id - the id of a role as a path param
 * @returns {Object} - role representation
 */
rolesRouter.get('/:id', isAuthenticated(), async (req, res) => {
  const { id } = req.params;
  if (id) {
    try {
      const role = await getRoleById(id);
      return res.status(200).json(role);
    } catch (e) {
      return res.status(400).json(e.toString());
    }
  } else {
    return res.status(400).json('Missing parameter id');
  }
});

/**
 * get all roles
 *
 * @returns {Array} - array of role representations
 */
rolesRouter.get('/', isAuthenticated(), async (req, res) => {
  try {
    const roles = await getRoles();
    if (roles.length === 0) return res.status(204).json([]);
    return res.status(200).json(roles);
  } catch (e) {
    return res.status(400).json(e.toString());
  }
});

/**
 * add a role
 *
 * @param {String} req.body - role representation in request body
 * @returns {String} - newly created role
 */
rolesRouter.post(
  '/',
  validateRole,
  isAllowed([PERMISSION_CREATE, PERMISSION_MANAGE], 'Role'),
  async (req, res) => {
    const role = req.body;
    role.default = false;
    if (role) {
      try {
        const createdRole = await addRole(role);
        res.status(201).json(createdRole);
        const { expiration, id, name, permissions } = createdRole;
        await ensureOpaSync(`roles/${createdRole.id}`, undefined, {
          expiration,
          id,
          name,
          permissions,
          ['default']: createdRole.default,
          admin: createdRole.admin,
          guest: createdRole.guest,
        });
        return;
      } catch (e) {
        return res.status(400).json(e.toString());
      }
    } else {
      return res.status(400).json('Missing body');
    }
  },
);

/**
 * update a role
 *
 * @param {String} req.body - role representation in request body
 * @returns {String} - updated role
 */
rolesRouter.put(
  '/:id',
  validateRole,
  isAllowed([PERMISSION_UPDATE, PERMISSION_MANAGE], 'Role', { includeBody: true }),
  async (req, res) => {
    const role = req.body;
    const { id } = req.params;
    if (role) {
      try {
        const updatedRole = await updateRole(id, role);
        res.status(200).json(updatedRole);
        await ensureOpaSync(`roles/${updatedRole.id}`, undefined, {
          name: updatedRole.name,
          id: updatedRole.id,
          expiration: updatedRole.expiration,
          permissions: updatedRole.permissions,
          ['default']: updatedRole.default,
          admin: updatedRole.admin,
          guest: updatedRole.guest,
        });
        return;
      } catch (e) {
        if (e.message === 'Role not found') return res.status(404).json({ error: e.toString() });
        return res.status(400).json(e.toString());
      }
    } else {
      return res.status(400).json('Missing body');
    }
  },
);

/**
 * delete an existing role
 *
 * @param {String} id - the id of the existing role in the path params
 * @returns {String} - id of deleted role
 */
rolesRouter.delete(
  '/:id',
  isAllowed([PERMISSION_DELETE, PERMISSION_MANAGE], 'Role'),
  async (req, res) => {
    const { id } = req.params;
    if (id) {
      try {
        await deleteRole(id);
        res.status(204).end();
        await ensureOpaSync(`roles/${id}`, 'DELETE');
        return;
      } catch (e) {
        if (e.message === 'Role not found') return res.status(404).json(e.toString());
        return res.status(400).json(e.toString());
      }
    } else {
      return res.status(400).json('Missing parameter id');
    }
  },
);

export default rolesRouter;

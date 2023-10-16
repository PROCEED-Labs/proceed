import express from 'express';
import {
  getRoleById,
  getRoles,
  addRole,
  updateRole,
  deleteRole,
} from '../../../shared-electron-server/data/iam/roles.js';
import { validateRole } from '../middleware/inputValidations.js';
import { abilityCacheDeleteAll, isAllowed, isAuthenticated } from '../middleware/authorization';
import Ability from '../../../../../../management-system-v2/lib/ability/abilityHelper';
import { toCaslResource } from '../../../../../../management-system-v2/lib/ability/caslAbility';

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
rolesRouter.post('/', validateRole, isAllowed('create', 'Role'), async (req, res) => {
  const role = req.body;
  role.default = false;
  if (role) {
    try {
      /** @type {Ability} */
      const userAbility = req.userAbility;

      if (!userAbility.can('create', toCaslResource('Role', role)))
        return res.status(403).send('Forbidden.');

      const createdRole = await addRole(role);
      res.status(201).json(createdRole);
    } catch (e) {
      return res.status(400).json(e.toString());
    }
  } else {
    return res.status(400).json('Missing body');
  }
});

/**
 * update a role
 *
 * @param {String} req.body - role representation in request body
 * @returns {String} - updated role
 */
rolesRouter.put('/:id', validateRole, isAllowed('update', 'Role'), async (req, res) => {
  const role = req.body;
  const { id } = req.params;

  if (role) {
    try {
      // validateRole turns expiration into a Date, in order for the object merge
      // to work, we need it to be a string (type safe option in mergeIntoObject)
      if (typeof role.expiration === 'object') {
        /** @type {Date} */
        const expirationDate = role.expiration;
        role.expiration = expirationDate.toISOString();
      }

      /** @type {Ability} */
      const userAbility = req.userAbility;

      const targetRole = getRoleById(id);

      for (const [key, value] of Object.entries(role)) {
        if (targetRole[key] === value) delete role[key];
      }

      // Casl isn't really built to check the value of input fields when updating, so we have to perform this two checks
      if (
        !(
          userAbility.checkInputFields(toCaslResource('Role', targetRole), 'update', role) &&
          userAbility.can('create', toCaslResource('Role', role))
        )
      )
        return res.status(403).send('Forbidden.');

      const updatedRole = await updateRole(id, role);
      res.status(200).json(updatedRole);

      // force all abilities to be rebuilt
      await abilityCacheDeleteAll();
    } catch (e) {
      if (e.message === 'Role not found') return res.status(404).json({ error: e.toString() });
      return res.status(400).json(e.toString());
    }
  } else {
    return res.status(400).json('Missing body');
  }
});

/**
 * delete an existing role
 *
 * @param {String} id - the id of the existing role in the path params
 * @returns {String} - id of deleted role
 */
rolesRouter.delete('/:id', isAllowed('delete', 'Role'), async (req, res) => {
  const { id } = req.params;
  if (id) {
    try {
      const role = getRoleById(id);

      if (!role) throw new Error('Role not found');

      /** @type {Ability} */
      const userAbility = req.userAbility;

      if (!userAbility.can('delete', toCaslResource('Role', role)))
        return res.status(403).send('Forbidden.');

      await deleteRole(id);
      res.status(204).end();

      // force all abilities to be rebuilt
      await abilityCacheDeleteAll();
      return;
    } catch (e) {
      if (e.message === 'Role not found') return res.status(404).json(e.toString());
      return res.status(400).json(e.toString());
    }
  } else {
    return res.status(400).json('Missing parameter id');
  }
});

export default rolesRouter;

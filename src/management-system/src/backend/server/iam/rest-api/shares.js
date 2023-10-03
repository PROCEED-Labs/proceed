import express from 'express';
import {
  addShare,
  updateShare,
  deleteShare,
  getShare,
  getShares,
} from '../../../shared-electron-server/data/iam/shares.js';
import { abilityCacheDeleteAll, isAllowed } from '../middleware/authorization';
import { validateShare } from '../middleware/inputValidations.js';
import jwt from 'jsonwebtoken';
import { toCaslResource } from '../authorization/caslRules';
import Ability from '../../../../../../management-system-v2/lib/ability/abilityHelper';

const sharesRouter = express.Router();

// set context (resourceId and resourceType) for opa when creating new shares, so that opa knows, which resources are affected
sharesRouter.use(['/', '/:id'], async (req, res, next) => {
  const { resourceId, resourceType } =
    req.query && req.query.resourceId && req.query.resourceType ? req.query : req.body;
  if (resourceId && resourceType) {
    req.context = {
      resourceId,
      resourceType,
    };
    next();
  } else {
    return res.status(400).json('Missing query parameter resourceId and/or resourceType!');
  }
});

/**
 * get all shares from server
 *
 * @returns {Array} - array of shares
 */
sharesRouter.get('/', isAllowed('view', 'Share'), async (req, res) => {
  const { shareType, userId } = req.query;
  try {
    /** @type {Ability} */
    const userAbility = req.userAbility;

    let shares = userAbility.filter('view', 'Share', await getShares());

    if (shareType) {
      shares = shares.filter((share) => share.type == shareType);
    }
    if (userId) {
      shares = shares.filter((share) => share.sharedWith === userId);
    }
    if (shares.length === 0) {
      return res.status(204).json([]);
    }
    return res.status(200).json(shares);
  } catch (e) {
    return res.status(400).json(e.toString());
  }
});

/**
 * get a share by id from server
 *
 * @returns {Object} - share object
 */
sharesRouter.get('/:id', isAllowed('view', 'Share'), async (req, res) => {
  const { id } = req.params;
  if (id) {
    try {
      const share = await getShare(id);

      /** @type {Ability} */
      const userAbility = req.userAbility;

      if (!userAbility.can('view', toCaslResource('Share', share)))
        return res.status(403).send('Forbidden.');

      return res.status(200).json(share);
    } catch (e) {
      return res.status(400).json(e.toString());
    }
  } else {
    return res.status(400).json('Missing parameter id!');
  }
});

/**
 * share a resource
 *
 * @returns {Object} - created share object
 */
sharesRouter.post('/', isAllowed('create', 'Share'), async (req, res) => {
  const share = req.body;
  if (req.session && req.session.tokenSet && req.session.tokenSet.access_token)
    share.sharedBy = jwt.decode(req.session.tokenSet.access_token).sub;
  if (share) {
    try {
      /** @type {Ability} */
      const userAbility = req.userAbility;

      if (!userAbility.can('create', toCaslResource('Share', share)))
        return res.status(403).send('Forbidden.');

      const response = await addShare(share);
      res.status(201).json(response);

      // force all abilities to be rebuilt
      await abilityCacheDeleteAll();
    } catch (e) {
      return res.status(400).json(e.toString());
    }
  } else {
    return res.status(400).json('Missing body!');
  }
});

/**
 * update a share by id
 *
 * @returns {Object} - updated share object
 */
sharesRouter.put('/:id', validateShare, isAllowed('update', 'Share'), async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  if (id && updates) {
    try {
      let share = await getShare(id);

      /** @type {Ability} */
      const userAbility = req.userAbility;

      if (!userAbility.can('update', toCaslResource('Share', share)))
        return res.status(403).send('Forbidden.');

      share = await updateShare(id, updates);
      res.status(200).json(share);

      // force all abilities to be rebuilt
      await abilityCacheDeleteAll();
    } catch (e) {
      return res.status(400).json(e.toString());
    }
  } else {
    return res.status(400).json('Missing parameter id and/or missing body!');
  }
});

/**
 * delete a share by id
 *
 * @returns {Array} - id of share object
 */
sharesRouter.delete('/:id', isAllowed('delete', 'Share'), async (req, res) => {
  const { id } = req.params;
  if (id) {
    try {
      let share = await getShare(id);

      /** @type {Ability} */
      const userAbility = req.userAbility;

      if (!userAbility.can('delete', toCaslResource('Share', share)))
        return res.status(403).send('Forbidden.');

      share = await deleteShare(id);
      res.status(204).end();

      // force all abilities to be rebuilt
      await abilityCacheDeleteAll();
    } catch (e) {
      return res.status(404).json(e.toString());
    }
  } else {
    return res.status(400).json('Missing parameter id!');
  }
});

export default sharesRouter;

import express from 'express';
import {
  addShare,
  updateShare,
  deleteShare,
  getShare,
} from '../../../shared-electron-server/data/iam/shares.js';
import { PERMISSION_SHARE } from '../../../../shared-frontend-backend/constants/index.js';
import { isAllowed } from '../middleware/authorization.js';
import { ensureOpaSync } from '../opa/opa-client.js';
import { validateShare } from '../middleware/inputValidations.js';
import jwt from 'jsonwebtoken';

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
sharesRouter.get(
  '/',
  isAllowed(PERMISSION_SHARE, undefined, { context: true, filter: true }),
  async (req, res) => {
    const { shareType, userId } = req.query;
    try {
      let shares = req.filter;
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
  }
);

/**
 * get a share by id from server
 *
 * @returns {Object} - share object
 */
sharesRouter.get(
  '/:id',
  isAllowed(PERMISSION_SHARE, undefined, { context: true }),
  async (req, res) => {
    const { id } = req.params;
    if (id) {
      try {
        const share = await getShare(id);
        return res.status(200).json(share);
      } catch (e) {
        return res.status(400).json(e.toString());
      }
    } else {
      return res.status(400).json('Missing parameter id!');
    }
  }
);

/**
 * share a resource
 *
 * @returns {Object} - created share object
 */
sharesRouter.post(
  '/',
  isAllowed(PERMISSION_SHARE, undefined, { context: true, includeBody: true }),
  async (req, res) => {
    const share = req.body;
    if (req.session && req.session.tokenSet && req.session.tokenSet.access_token)
      share.sharedBy = jwt.decode(req.session.tokenSet.access_token).sub;
    if (share) {
      try {
        const response = await addShare(share);
        res.status(201).json(response);
        await ensureOpaSync(
          `shares/${response.resourceType}/${response.resourceId}/${response.sharedWith}`,
          undefined,
          response
        );
        return;
      } catch (e) {
        return res.status(400).json(e.toString());
      }
    } else {
      return res.status(400).json('Missing body!');
    }
  }
);

/**
 * update a share by id
 *
 * @returns {Object} - updated share object
 */
sharesRouter.put(
  '/:id',
  validateShare,
  isAllowed(PERMISSION_SHARE, undefined, { context: true, includeBody: true }),
  async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    if (id && updates) {
      try {
        const share = await updateShare(id, updates);
        res.status(200).json(share);
        await ensureOpaSync(
          `shares/${share.resourceType}/${share.resourceId}/${share.sharedWith}`,
          undefined,
          share
        );
        return;
      } catch (e) {
        return res.status(400).json(e.toString());
      }
    } else {
      return res.status(400).json('Missing parameter id and/or missing body!');
    }
  }
);

/**
 * delete a share by id
 *
 * @returns {Array} - id of share object
 */
sharesRouter.delete(
  '/:id',
  isAllowed(PERMISSION_SHARE, 'Share', { context: true }),
  async (req, res) => {
    const { id } = req.params;
    if (id) {
      try {
        const share = await deleteShare(id);
        res.status(204).end();
        await ensureOpaSync(
          `shares/${share.resourceType}/${share.resourceId}/${share.sharedWith}`,
          'DELETE'
        );
        return;
      } catch (e) {
        return res.status(404).json(e.toString());
      }
    } else {
      return res.status(400).json('Missing parameter id!');
    }
  }
);

export default sharesRouter;

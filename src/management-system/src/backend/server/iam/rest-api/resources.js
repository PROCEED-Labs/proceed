import express from 'express';
import { getResource, getResources } from '../../../shared-electron-server/data/iam/resources.js';
import { isAuthenticated } from '../middleware/authorization';

const resourcesRouter = express.Router();

/**
 * get all resources from server
 *
 * @returns {Array} - array of resources
 */
resourcesRouter.get('/', isAuthenticated(), async (req, res) => {
  try {
    const resources = await getResources();
    if (resources.length === 0) {
      return res.status(204).json([]);
    }
    return res.status(200).json(resources);
  } catch (e) {
    return res.status(400).json({ error: e.toString() });
  }
});

/**
 * get a resource by id from server
 *
 * @param {String} id - id of resource object
 * @returns {Array} - resource object
 */
resourcesRouter.get('/:id', isAuthenticated(), (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json('Missing parameter id');

  const resource = getResource(id);
  if (resource) return res.status(200).json(resource);

  return res.status(404).end();
});

export default resourcesRouter;

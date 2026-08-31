import express from 'express';
import {
  createResourceList,
  getJobStatus,
  getResourceList,
  getResourceLists,
} from '../middleware/resource';
import { config } from '../config';

const { multipleDBs } = config;

const router = express.Router();

// .all()
// .get()
// .put()
// .post();
// .patch();
// .delete();

// '/:resource-list-id'
// '/:resource-list-id/:resource-id'
// '/:resource-list-id/:resource-id/:competence-id'

// Getting an overview of all resource lists should be tennant-specific,
// so it should only be available if multipleDBs is true.
if (multipleDBs) router.route('/').get(getResourceLists);

router.route('/jobs').post(createResourceList);
router.route('/jobs/:jobId').get(getJobStatus);

router.route('/:resourceListId').get(getResourceList);

export default router;

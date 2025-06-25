import express from 'express';
import {
  createResourceList,
  getJobStatus,
  getResourceList,
  getResourceLists,
} from '../middleware/resource';

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

router.route('/').get(getResourceLists);

router.route('/jobs').post(createResourceList);
router.route('/jobs/:jobId').get(getJobStatus);

router.route('/:resourceListId').get(getResourceList);

export default router;

import express from 'express';
import { getMatchJobResults, matchCompetenceList } from '../middleware/match';

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

router.route('/jobs/').post(matchCompetenceList);

router.route('/jobs/:jobId').get(getMatchJobResults);

export default router;

import express from 'express';
import { rulesForUser } from '../authorization/caslRules';

const abilityRouter = express.Router();

/**
 * get casl Ability rules for the requesting user
 *
 */
abilityRouter.get('/', async (req, res) => {
  if (!req.session.userId) return res.status(403).end('Forbidden');

  const userRules = await rulesForUser(req.session.userId);
  res.json(userRules);
});

export default abilityRouter;

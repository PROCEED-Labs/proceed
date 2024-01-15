import url from 'url';
import express from 'express';
import processRouter from './process.js';
import machinesRouter from './machine.js';
import speechAssistantRouter from './speechAssistant.js';
import keycloakUserRouter from '../iam/rest-api/keycloak/user.js';
import auth0UserRouter from '../iam/rest-api/auth0/user.js';
import rolesRouter from '../iam/rest-api/roles.js';
import roleMappingsRouter from '../iam/rest-api/role-mappings.js';
import resourcesRouter from '../iam/rest-api/resources.js';
import sharesRouter from '../iam/rest-api/shares.js';
import { validateRequest } from '../iam/middleware/requestValidation.js';
import getSessionFromCookie from '../iam/middleware/nextAuthMiddleware.js';
import abilityRouter from '../iam/rest-api/ability.js';
import settingsRouter from './settings.js';

// middleware for all routes to refactor the code
const createApiRouter = (config, client) => {
  const apiRouter = express.Router();

  apiRouter.use(validateRequest());
  apiRouter.use('/process', processRouter);
  apiRouter.use('/machines', machinesRouter);
  apiRouter.use('/speech', speechAssistantRouter);
  apiRouter.use('/settings', settingsRouter);
  if (config.useAuthorization) {
    if (config.useAuth0)
      url.parse(client.issuer.issuer).hostname.match('\\.auth0\\.com$')
        ? apiRouter.use('/users', auth0UserRouter)
        : apiRouter.use('/users', keycloakUserRouter);

    apiRouter.use('/roles', rolesRouter);
    apiRouter.use('/role-mappings', roleMappingsRouter);
    apiRouter.use('/resources', resourcesRouter);
    apiRouter.use('/shares', sharesRouter);
    apiRouter.use('/ability', abilityRouter);
  }

  return apiRouter;
};

export default createApiRouter;

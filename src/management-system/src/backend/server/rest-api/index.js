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

// middleware for all routes to refactor the code
const createApiRouter = (config, client) => {
  const apiRouter = express.Router();

  apiRouter.use(validateRequest());
  apiRouter.use('/process', processRouter);
  apiRouter.use('/machines', machinesRouter);
  apiRouter.use('/speech', speechAssistantRouter);
  if (config.useAuthorization) {
    url.parse(client.issuer.issuer).hostname.match('\\.auth0\\.com$')
      ? apiRouter.use('/users', auth0UserRouter)
      : apiRouter.use('/users', keycloakUserRouter);
    apiRouter.use('/roles', rolesRouter);
    apiRouter.use('/role-mappings', roleMappingsRouter);
    apiRouter.use('/resources', resourcesRouter);
    apiRouter.use('/shares', sharesRouter);
  }

  return apiRouter;
};

export default createApiRouter;

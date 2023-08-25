import express from 'express';
import authHandler from './handlers/index.js';
import { validateRequest } from '../middleware/requestValidation.js';

/**
 * creates authentication related routes for express application
 *
 * @returns {Express.Router} - Express router
 */
const authRouter = (config, client) => {
  const authenticationRouter = new express.Router();

  if (config && config.useAuthorization) {
    /**
     * login user from idp
     *
     * @returns {Express.Handler} - login handler
     */
    authenticationRouter.get(
      '/login',
      validateRequest(false),
      async (req, res) => await authHandler.login(req, res, client, config),
    );

    if (config.allowRegistrations) {
      /**
       * register user at idp
       *
       * @returns {Express.Handler} - login handler with register true
       */
      authenticationRouter.get(
        '/register',
        validateRequest(false),
        async (req, res) => await authHandler.login(req, res, client, config, true),
      );
    }

    /**
     * logout user from application and idp
     *
     * @returns {Express.Handler} - logout handler
     */
    authenticationRouter.get(
      '/logout',
      validateRequest(false),
      async (req, res) => await authHandler.logout(req, res, client, config),
    );

    /**
     * get userinfo about authenticated user from idp
     *
     * @returns {Express.Handler} - getuserInfo handler
     */
    authenticationRouter.get(
      '/userinfo',
      validateRequest(),
      async (req, res) => await authHandler.getUserinfo(req, res, client, config),
    );
  }

  /**
   * callback for openid connect authentication flow
   *
   * @returns {Express.Handler} - handleOauthCallback handler
   */
  authenticationRouter.post(
    '/callback',
    validateRequest(false),
    async (req, res) => await authHandler.handleOauthCallback(req, res, client, config),
  );

  return authenticationRouter;
};

export default authRouter;

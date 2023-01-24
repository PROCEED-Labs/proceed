import { doOpaRequest } from '../opa/opa-client.js';
import { config } from '../utils/config.js';
import { roleMappingsMetaObjects } from '../../../shared-electron-server/data/iam/role-mappings.js';

/**
 * can be used as express middleware in app.use(...) or directly in route e.g. app.get(path, isAllowed(...), ...)
 *
 * @param {Array<Number>|Number}permission - number or array of numbers, which specifies the necessary permission (e.g. 1 = 'view' -> pass 1 as parameter)
 * @param {String|undefined} resource - resource name in singular and uppercase (e.g. "Role" or "Process")
 * @param {Object} options - additional options (optional)
 * @param {true|false} options.filter - filter user related resources from OPA (e.g. if true, opa returns only the processes a user has access to)
 * @param {true|false} options.context - context passed to OPA
 * @param {true|false} options.explain - return error message from OPA
 * @param {true|false} options.includeBody - pass http request body to OPA
 * @param {String} options.decisionStrategy - unanimous or affirmative (default)
 *
 * @example
 * // checks if user has 16 = manage permissions for resource Role
 * isAllowed(16, 'Role')
 * // checks if user has 8 = delete OR 16 = manage permissions for resource Group
 * isAllowed([8, 16], 'Group')
 * // checks if user has 8 = delete AND 16 = manage permissions for resource Group (default decisionStrategy = "affirmative")
 * isAllowed([8, 16], 'Group', { decisionStrategy: "unanimous" })
 * // tells OPA to filter resources, which are only available for current authenticated user if user has sufficient permissions
 * isAllowed(1, 'Process', { filter: true })
 * // if resource is set to undefined, context MUST be set to true and req.context has to be set in a middleware, to provide resourceType and resourceId to OPA via context (useful for routes that can handle multiple types of resources)
 * isAllowed(16, undefined, { context: true })
 * // get error messages from OPA
 * isAllowed(1, 'Process', { explain: true })
 * // pass http body from request to OPA
 * isAllowed(1, 'Process', { includeBody: true })
 */
export const isAllowed = (
  permission,
  resource,
  {
    explain = false,
    filter = false,
    includeBody = false,
    context = false,
    decisionStrategy = undefined,
  } = {}
) => {
  return async (req, res, next) => {
    // skip middleware if authorization disabled
    if (!config.useAuthorization) {
      return next();
    }

    // construct path
    const path = req.baseUrl + decodeURI(req.path); // decode path because auth0 user id is encoded in path as auth0%7C... instead of auth0|...

    // input for opa policy evaluation
    const input = {
      permission,
      resource: resource
        ? resource[0].toUpperCase() + resource.slice(1) // ensure first letter capital
        : null,
      method: req.method,
      path: path.split('/').filter((param) => param !== 'api' && param),
      filter,
      explain,
    };

    if (includeBody === true) input.body = req.body;
    if (context === true) input.context = req.context;
    if (decisionStrategy) input.decision_strategy = decisionStrategy;

    // set user and roles for opa input
    if (req.session && req.session.userId) {
      input.user = {
        id: req.session.userId,
        roles: roleMappingsMetaObjects.users[req.session.userId]
          ? roleMappingsMetaObjects.users[req.session.userId].map(
              (roleMapping) => roleMapping.roleId
            )
          : null,
      };
    }

    // set options for opa http request
    const options = {
      method: 'POST',
      body: input,
    };

    try {
      const opaResponse = await doOpaRequest(undefined, options);
      if (opaResponse.allow === true) {
        if (input.filter) req.filter = opaResponse.filter ? opaResponse.filter : [];
        return next();
      } else {
        return res.status(403).send('Forbidden');
      }
    } catch (err) {
      return res.status(400).send('Policy evaluation failed');
    }
  };
};

/**
 * check if user is authenticated
 */
export const isAuthenticated = () => {
  return async (req, res, next) => {
    // skip middleware
    if (!config.useAuthorization) {
      return next();
    }

    if (req.session && req.session.userId) {
      next();
    } else {
      return res.status(401).send('Unauthenticated');
    }
  };
};

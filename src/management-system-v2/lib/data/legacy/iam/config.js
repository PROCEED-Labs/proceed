import * as yup from 'yup';
import crypto from 'crypto';
import ports from '../../../../../management-system/ports.js';
import logger from '../logging.js';
import { mergeIntoObject } from '../../../helpers/javascriptHelpers';

export let config = {};

const defaultFrontendAddress =
  process.env.NODE_ENV === 'development'
    ? `https://localhost:${ports['dev-server'].frontend}`
    : `https://localhost:${ports.frontend}`;

const puppeteerAddress =
  process.env.NODE_ENV === 'development'
    ? `https://localhost:${ports['dev-server'].puppeteer}`
    : `https://localhost:${ports.puppeteer}`;

// schema for the iam configuration object
const schema = yup.object({
  response_type: yup
    .string()
    .oneOf(['id_token', 'code id_token', 'code'])
    .optional()
    .default('code'),
  scope: yup
    .string()
    .optional()
    .matches(/\bopenid\b/)
    .default('openid profile email'),
  response_mode: yup
    .string()
    .optional()
    .when('response_type', {
      is: 'code',
      then: yup.string().oneOf(['query', 'fragment', 'form_post']).default('form_post'),
      otherwise: yup.string().oneOf(['form_post', 'fragment']).default('form_post'),
    }),
  msURL: yup
    .string()
    .matches(
      /^(?:([a-z0-9+.-]+):\/\/)(?:\S+(?::\S*)?@)?(?:(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*\.?)(?::\d{2,5})?(?:[/?#]\S*)?$/i,
    )
    .test(
      'is-https-uri',
      'Using form_post for response_mode may cause issues for you logging in over http, see https://github.com/auth0/express-openid-connect/blob/master/FAQ.md',
      (value) => /^https:/i.test(value),
    )
    .default('https://localhost:' + ports['dev-server'].frontend)
    .when(['useAuthorization', 'useAuth0'], {
      is: true,
      then: (schema) => schema.required(),
      otherwise: (schema) => schema.optional(),
    }),
  useAuth0: yup.boolean().optional().default(false),
  clientID: yup.string().when(['useAuthorization', 'useAuth0'], {
    is: true,
    then: (schema) => schema.required(),
    otherwise: (schema) => schema.optional(),
  }),
  clientSecret: yup
    .string()
    .test(
      'includes-code',
      'Client Secret is required for a response type that includes code',
      (_, testContext) => testContext.parent.response_type.includes('code'),
    )
    .when(['useAuthorization', 'useAuth0'], {
      is: true,
      then: (schema) => schema.required(),
      otherwise: (schema) => schema.optional(),
    }),
  clientAuthMethod: yup
    .string()
    .oneOf(['client_secret_basic', 'client_secret_post', 'none'])
    .optional()
    .default(() => {
      return yup.ref('response_type') === 'id_token' ? 'none' : 'client_secret_basic';
    }),
  clientCredentialScope: yup.string().when('createIdpAdmin', {
    is: true,
    then: (schema) => schema.required(),
    otherwise: (schema) => schema.optional(),
  }),
  idpLogout: yup.boolean().optional().default(false),
  tokenSigningAlgorithm: yup.string().notOneOf(['none']).optional().default('RS256'),
  baseAuthUrl: yup
    .string()
    .matches(
      /^(?:([a-z0-9+.-]+):\/\/)(?:\S+(?::\S*)?@)?(?:(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*\.?)(?::\d{2,5})?(?:[/?#]\S*)?$/i,
    )

    .when(['useAuthorization', 'useAuth0'], {
      is: true,
      then: (schema) => schema.required(),
      otherwise: (schema) => schema.optional(),
    }),
  useSessionManagement: yup.boolean().optional().default(false),
  allowRegistrations: yup.boolean().optional().default(false),
  useAuthorization: yup.boolean().optional().default(false),
  tenant: yup.string().optional().default('PROCEED'),
  opaHost: yup
    .string()
    .optional()
    .default(() => {
      return process.env.NODE_ENV === 'production' ? 'opa' : 'localhost';
    }),
  opaPort: yup.number().optional().default(8181),
  opaVersion: yup.string().optional().default('v1'),
  redisHost: yup
    .string()
    .optional()
    .default(() => {
      return process.env.NODE_ENV === 'production' ? 'redis' : 'localhost';
    }),
  redisPassword: yup.string().required().default('password'),
  redisPort: yup.number().optional().default(6379),
  createIdpAdmin: yup.boolean().optional().default(false),
  adminUsername: yup
    .string()
    .default('admin')
    .when('createIdpAdmin', {
      is: true,
      then: (schema) => schema.required(),
      otherwise: (schema) => schema.optional(),
    }),
  adminEmail: yup
    .string()
    .email()
    .default('admin@proceed.com')
    .when('createIdpAdmin', {
      is: true,
      then: (schema) => schema.required(),
      otherwise: (schema) => schema.optional(),
    }),
  adminPassword: yup.string().when('createIdpAdmin', {
    is: true,
    then: (schema) => schema.required(),
    otherwise: (schema) => schema.optional(),
  }),
  secretKey: yup.string().required().default(crypto.randomBytes(32).toString('hex')),
  trustedOrigins: yup
    .array()
    .of(
      yup
        .string()
        .matches(
          /^(?:([a-z0-9+.-]+):\/\/)(?:\S+(?::\S*)?@)?(?:(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*\.?)(?::\d{2,5})?(?:[/?#]\S*)?$/i,
        ),
    )
    .optional()
    .default([defaultFrontendAddress, puppeteerAddress]),
  nextAuthSecret: yup.string().when('useAuthorization', {
    is: true,
    then: (schema) => (process.env.API_ONLY ? schema.required() : schema.optional()),
    otherwise: (schema) => (process.env.API_ONLY ? schema.required() : schema.optional()),
  }),
});

/**
 * creates iam configuration based on parameters and schema
 *
 * @param {Object} - iam configuration object
 * @returns {Object} - validated iam configuration object
 */
const createConfig = (params = {}) => {
  mergeIntoObject(
    params,
    {
      response_type: process.env.AUTH_RESPONSE_TYPE,
      scope: process.env.AUTH_SCOPE,
      response_mode: process.env.AUTH_RESPONSE_MODE,
      msURL: process.env.MS_URL,
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      clientAuthMethod: process.env.CLIENT_AUTH_METHOD,
      clientCredentialScope: process.env.CLIENT_CREDENTIAL_SCOPE,
      idpLogout: process.env.IDP_LOGOUT ? JSON.parse(process.env.IDP_LOGOUT) : undefined,
      tokenSigningAlgorithm: process.env.TOKEN_SIGNING_ALGORITHM,
      baseAuthUrl: process.env.BASE_AUTH_URL,
      useSessionManagement: process.env.USE_SESSION_MANAGEMENT
        ? JSON.parse(process.env.USE_SESSION_MANAGEMENT)
        : undefined,
      allowRegistrations: process.env.ALLOW_REGISTRATIONS
        ? JSON.parse(process.env.ALLOW_REGISTRATIONS)
        : undefined,
      useAuthorization: process.env.USE_AUTHORIZATION
        ? JSON.parse(process.env.USE_AUTHORIZATION)
        : undefined,
      tenant: process.env.TENANT,
      opaHost: process.env.OPA_HOST,
      opaPort: process.env.OPA_PORT ? Number(process.env.OPA_PORT) : undefined,
      opaVersion: process.env.OPA_VERSION,
      redisHost: process.env.REDIS_HOST,
      redisPort: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : undefined,
      redisPassword: process.env.REDIS_PASSWORD,
      createIdpAdmin: process.env.CREATE_IDP_ADMIN
        ? JSON.parse(process.env.CREATE_IDP_ADMIN)
        : undefined,
      adminUsername: process.env.ADMIN_USERNAME,
      adminEmail: process.env.ADMIN_EMAIL,
      adminPassword: process.env.ADMIN_PASSWORD,
      secretKey: process.env.SECRET_KEY,
      trustedOrigins: process.env.TRUSTED_ORIGINS
        ? process.env.TRUSTED_ORIGINS.split(',')
        : undefined,
      nextAuthSecret:
        process.env.NEXTAUTH_SECRET ||
        (process.env.API_ONLY &&
          process.env.NODE_ENV === 'development' &&
          'T8VB/r1dw0kJAXjanUvGXpDb+VRr4dV5y59BT9TBqiQ='),
    },
    true,
    false,
    true,
  );

  try {
    //config = await schema.validate(params);
    return Object.freeze(params);
  } catch (e) {
    logger.error(e.toString());
    throw new Error(e.toString());
  }
};

export default createConfig;

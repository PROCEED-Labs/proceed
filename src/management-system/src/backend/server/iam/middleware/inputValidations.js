import * as yup from 'yup';
import {
  TYPE_USER,
  TYPE_GROUP,
  TYPE_LINK,
} from '../../../../shared-frontend-backend/constants/index.js';
import { client } from '../authentication/client.js';

// abortEarly: false leads to returning all validation errors instead of aborting directly at the first error
const abortEarly = process.env.NODE_ENV === 'development' ? false : true;

// middleware that validates user schema
const validateUser = async (req, res, next) => {
  const user = req.body;

  // default schema for every user object
  const schema = {
    firstName: yup
      .string()
      .min(1)
      .max(35)
      .matches(/^[A-Za-z-]+$/)
      .required(),
    lastName: yup.string().min(1).max(35).required(),
    email: yup.string().email().min(5).max(254).required(),
    username: yup
      .string()
      .min(3)
      .max(30)
      .matches(/^[A-Za-z-_0-9]+$/)
      .required(),
  };

  /*
   * password policy for creating users
   *
   * at least 8 character
   * not the same as email and username
   * at least one lowercase character
   * at least one uppercase character
   * at least one number
   * special characters list from OWASP: https://owasp.org/www-community/password-special-characters
   */
  if (req.originalUrl === '/api/users' && req.method === 'POST') {
    schema.password = yup
      .string()
      .min(8)
      .notOneOf([user.email, user.username])
      .matches(/(?=.*[a-z])/)
      .matches(/(?=.*[A-Z])/)
      .matches(/(?=.*\d)/)
      .matches(/([!"#$%&'()*+,-./:;<=>?\[\]@\\^_`{|}~])/)
      .required();
  }

  // create schema and don't allow no unknown fields
  const userSchema = yup.object(schema).strict().noUnknown(true);

  try {
    await userSchema.validate(user, { abortEarly });
  } catch (e) {
    const { name, value, errors } = e;
    return res.status(400).json({ name, value, errors });
  }

  return next();
};

// middleware that validates roles schema
const validateRole = async (req, res, next) => {
  const role = req.body;

  if (role.createdOn && role.lastEdited) {
    role.createdOn = new Date(role.createdOn);
  }

  if (role.lastEdited) {
    role.lastEdited = new Date(role.lastEdited);
  }

  if (role.expiration) {
    role.expiration = new Date(role.expiration);
  }

  const schema = {
    name: yup
      .string()
      .min(5)
      .max(50)
      .matches(/^[A-Za-z_\-0-9@]+$/)
      .required(),
    description: yup.string().max(255).nullable(),
    note: yup.string().max(255).nullable(),
    permissions: yup.object().nullable(),
    expiration: yup.date().nullable(),
    attributes: yup.object().nullable(),
    id: yup.string().uuid(),
    createdOn: yup.date(),
    lastEdited: yup.date(),
    default: yup.boolean(),
  };

  // create schema and don't allow unknown fields
  const roleSchema = yup.object(schema).strict().noUnknown(true);

  try {
    await roleSchema.validate(role, { abortEarly });
  } catch (e) {
    const { name, value, errors } = e;
    return res.status(400).json({ name, value, errors });
  }

  return next();
};

const validateShare = async (req, res, next) => {
  const share = req.body;

  const schema = {
    permissions: yup.number().min(0).max(9007199254740991).required(),
    resourceType: yup.string().required(),
    resourceId: yup.string().required(),
    resourceOwner: yup.string().uuid(),
    type: yup.number().oneOf([TYPE_USER, TYPE_GROUP, TYPE_LINK]).required(),
    password: yup.string().nullable(),
    note: yup.string(),
    id: yup.string().uuid(),
    createdOn: yup.date().nullable(),
    updatedOn: yup.date().nullable(),
    expiredAt: yup.date().nullable(),
  };

  // auth0 has no uuid as user id
  if (share.type !== TYPE_LINK) {
    if (client.idp === 'auth0') {
      schema.sharedWith = yup
        .string()
        .matches(/auth0\|([0-9]|[a-z])*/g)
        .required();
    } else {
      schema.sharedWith = yup.string().uuid().required();
    }
  }

  if (share.createdOn) {
    share.createdOn = new Date(share.createdOn);
  }

  if (share.updatedOn) {
    share.updatedOn = new Date(share.updatedOn);
  }

  if (share.expiredAt) {
    share.expiredAt = new Date(share.expiredAt);
  }

  if (req.method === 'PUT') {
    delete schema.type;
    delete schema.sharedWith;
    schema.permissions = yup.number().min(0).max(9007199254740991);
  }

  // create schema and don't allow unknown fields
  const shareSchema = yup.object(schema).strict().noUnknown(true);

  try {
    await shareSchema.validate(share, { abortEarly });
  } catch (e) {
    const { name, value, errors } = e;
    return res.status(400).json({ name, value, errors });
  }

  return next();
};

export { validateUser, validateRole, validateShare };

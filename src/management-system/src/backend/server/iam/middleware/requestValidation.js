import { config } from '../utils/config.js';
import logger from '../../../shared-electron-server/logging.js';
import { isOriginTrusted } from '../utils/utils.js';
import { decrypt } from '../utils/crypto.js';

const validate = (data, req) => {
  if (req.method !== 'GET' && !isOriginTrusted(data.origin)) {
    logger.error('The call is from an untrusted origin.');
    throw 'Forbidden';
  }

  if (data.requireCsrf && config.useAuthorization) {
    if (req.method !== 'GET' && !data.preflightCsrf) {
      logger.error('Preflight csrf value missing.');
      throw 'Forbidden';
    }

    if (data.csrfHeader) {
      const decryptedToken = decrypt(req.session.userId, data.csrfHeader, data.encryptionKey);

      if (decryptedToken !== req.session.userId) {
        logger.error('Invalid csrf token.');
        throw 'Forbidden';
      }
    } else {
      logger.error('No csrf token available.');
      throw 'Forbidden';
    }
  }
};

export const validateRequest = (requireCsrf = true) => {
  return async (req, res, next) => {
    if (process.env.API_ONLY) return next();

    const requestData = {
      preflightCsrf: req.headers.hasOwnProperty('x-csrf') ? true : false,
      csrfHeader: req.headers && req.headers['csrf-token'],
      origin: (req.headers && req.headers['origin']) || (req.headers && req.headers['referer']),
      encryptionKey: config.secretKey,
      requireCsrf,
    };

    try {
      await validate(requestData, req, res);
      return next();
    } catch (e) {
      return res.status(403).json(e);
    }
  };
};

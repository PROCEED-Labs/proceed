import { decode } from 'next-auth/jwt';

export function getSessionFromCookie(config) {
  return async function (req, _, next) {
    try {
      if (
        !req.headers ||
        !req.cookies ||
        typeof req.cookies['__Secure-next-auth.session-token'] !== 'string'
      ) {
        req.session = {};
        return next();
      }

      const payload = await decode({
        token: req.cookies['__Secure-next-auth.session-token'],
        secret: config.nextAuthSecret,
        req,
      });

      const payloadCsrfToken = payload.csrfToken;
      const userCsrfToken = req.headers['x-csrf-token'];

      if (!payloadCsrfToken || userCsrfToken !== payloadCsrfToken) {
        req.session = {};
        return next();
      }

      if (payload !== null && typeof payload === 'object' && 'user' in payload) {
        req.session = payload.user;
        req.session.userId = req.session.id;
        delete req.session.id;
      }
    } catch (_) {
      console.log(_);
    } finally {
      if (!req.session) req.session = {};
    }

    next();
  };
}

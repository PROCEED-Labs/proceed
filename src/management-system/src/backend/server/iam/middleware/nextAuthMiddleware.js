import { decode } from 'next-auth/jwt';

export async function getSessionFromCookie(req, _, next) {
  if (!req.headers || !req.cookies || typeof req.cookies['next-auth.session-token'] !== 'string') {
    req.session = {};
    return next();
  }
  const payload = await decode({
    token: req.cookies['next-auth.session-token'],
    secret: process.env.NEXTAUTH_SECRET,
    req,
  });

  const payloadCsrfToken = payload.csrfToken;
  const userCsrfToken = req.headers['csrf-token'];

  if (!payloadCsrfToken || userCsrfToken !== payloadCsrfToken) {
    req.session = {};
    return next();
  }

  if (payload !== null && typeof payload === 'object' && 'user' in payload) {
    req.session = payload.user;
    req.session.userId = req.session.id;
    delete req.session.id;
  } else {
    req.session = {};
  }

  next();
}

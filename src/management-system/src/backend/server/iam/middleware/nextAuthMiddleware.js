import { decode } from 'next-auth/jwt';

export async function getSessionFromCookie(req, _, next) {
  const payload = await decode({
    token: req.cookies['next-auth.session-token'],
    secret: process.env.NEXTAUTH_SECRET,
    req,
  });

  if (typeof payload === 'object' && 'user' in payload) {
    req.session = payload.user;
    req.session.userId = req.session.id;
    delete req.session.id;
  } else {
    req.session = {};
  }

  next();
}

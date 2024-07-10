import store from './store.js';
import { z } from 'zod';

const verificationTokenSchema = z.union([
  z.object({
    token: z.string(),
    identifier: z.string(),
    expires: z.date(),
    updateEmail: z.literal(false).optional(),
  }),
  z.object({
    token: z.string(),
    identifier: z.string(),
    expires: z.date(),
    updateEmail: z.literal(true),
    userId: z.string(),
  }),
]);

export type VerificationToken = z.infer<typeof verificationTokenSchema>;

// @ts-ignore
let firstInit = !global.verificationTokensMetaObject;

export let verificationTokensMetaObject: Record<string, VerificationToken & { id: string }> =
  // @ts-ignore
  global.verificationTokensMetaObject || (global.verificationTokensMetaObject = {});

/** initializes the folders meta information objects */
export function init() {
  if (!firstInit) return;

  const storedTokens = store.get('verificationTokens') as (VerificationToken & { id: string })[];

  for (const token of storedTokens) verificationTokensMetaObject[token.token] = token;
}

init();

export function getVerificationToken(params: Pick<VerificationToken, 'token' | 'identifier'>) {
  const token = verificationTokensMetaObject[params.token];
  if (!token || token.identifier !== params.identifier) return;

  return token as VerificationToken;
}

export function deleteVerificationToken(params: Pick<VerificationToken, 'token' | 'identifier'>) {
  const token = verificationTokensMetaObject[params.token];
  if (!token || token.identifier !== params.identifier) throw new Error('Token not found');

  store.remove('verificationTokens', token.token);
  delete verificationTokensMetaObject[token.token];
}

export function createVerificationToken(tokenInput: VerificationToken) {
  const token = verificationTokenSchema.parse(tokenInput);

  if (verificationTokensMetaObject[token.token]) {
    throw new Error('Token already exists');
  }

  const storeToken = { ...token, id: token.token }; // id because the store needs an id

  verificationTokensMetaObject[token.token] = storeToken;
  store.add('verificationTokens', storeToken);

  return token;
}

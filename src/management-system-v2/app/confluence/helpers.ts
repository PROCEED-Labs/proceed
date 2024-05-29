'use server';
import jwt, { JwtPayload } from 'jsonwebtoken';
import atlassianJwt from 'atlassian-jwt';

import { getSharedSecret } from '../../lib/sharedSecrets';

export const getSpaces = async (jwtToken: any) => {
  console.log('jwtToken', jwtToken);
  const tokenVerified = verifyJwt(jwtToken);
  if (!tokenVerified) {
    throw new Error('Token not verified');
  }
  const res = await fetch('https://proceed-test.atlassian.net/wiki/api/v2/spaces', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${jwtToken}`,
      'Content-Type': 'application/json',
    },
  });
  return res;
};

const verifyJwt = (jwtToken: any) => {
  const decoded = jwt.decode(jwtToken, { complete: true });
  const { iss: clientKey } = decoded!.payload as JwtPayload;
  const sharedSecretInfo = getSharedSecret(clientKey!);

  const { sharedSecret } = sharedSecretInfo;
  const verified = atlassianJwt.decodeSymmetric(
    jwtToken,
    sharedSecret,
    atlassianJwt.SymmetricAlgorithm.HS256,
  );

  if (!verified) {
    throw new Error('Invalid Token');
  }
  return true;
};

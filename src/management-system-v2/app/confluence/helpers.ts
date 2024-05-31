'use server';
import jwt, { JwtPayload } from 'jsonwebtoken';
import atlassianJwt from 'atlassian-jwt';

export const getSpaces = async (jwtToken: any) => {
  console.log('jwtToken', jwtToken);
  const tokenVerified = await verifyJwt(jwtToken);
  if (!tokenVerified) {
    console.log('Token not verified');
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

const verifyJwt = async (jwtToken: any) => {
  const decoded = jwt.decode(jwtToken, { complete: true });
  const { iss: clientKey } = decoded!.payload as JwtPayload;

  const res = await fetch(
    'https://pr-281---ms-server-staging-c4f6qdpj7q-ew.a.run.app/api/confluence/sharedSecret',
    {
      method: 'GET',
    },
  );

  const { sharedSecrets } = await fetch(
    'https://pr-281---ms-server-staging-c4f6qdpj7q-ew.a.run.app/api/confluence/sharedSecret',
    {
      method: 'GET',
    },
  ).then((res) => {
    return res.json();
  });

  const sharedSecret = Object.entries(sharedSecrets).map(([key, val]) => {
    const values = val as { sharedSecret: string; baseUrl: string };
    console.log('clientKey', key);
    console.log('sharedSecret', values.sharedSecret);
    console.log('baseUrl', values.baseUrl);
    return values.sharedSecret;
  })[0];

  const verified = atlassianJwt.decodeSymmetric(
    jwtToken,
    sharedSecret,
    atlassianJwt.SymmetricAlgorithm.HS256,
  );

  return verified;
};

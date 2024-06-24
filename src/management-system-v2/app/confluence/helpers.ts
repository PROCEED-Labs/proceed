'use server';
import jwt, { JwtPayload } from 'jsonwebtoken';
import * as AtlassianJwt from 'atlassian-jwt';

export const getSpaces = async (jwtToken: any) => {
  console.log('jwtToken', jwtToken);
  const tokenVerified = await verifyJwt(jwtToken);
  console.log('tokenVerified', tokenVerified);
  if (!tokenVerified) {
    console.log('Token not verified');
  }

  const decoded = jwt.decode(jwtToken, { complete: true });
  const { iss: clientKey } = decoded!.payload as JwtPayload;
  const req: AtlassianJwt.Request = AtlassianJwt.fromMethodAndUrl(
    'GET',
    'https://proceed-test.atlassian.net/wiki/api/v2/pages',
  );
  const tokenData = {
    iss: clientKey,
    iat: Math.floor(+new Date() / 1000), // The time the token is generated
    exp: Math.floor((+new Date() + 1000 * 60 * 60 * 5) / 1000), // Token expiry time (recommend 3 minutes after issuing)
    sub: '712020:3a3f17e3-744f-4cd0-accc-1311bd5daad6',
    qsh: AtlassianJwt.createQueryStringHash({
      method: 'GET',
      pathname: 'https://proceed-test.atlassian.net/wiki/api/v2/pages',
    }), // [Query String Hash](https://developer.atlassian.com/cloud/jira/platform/understanding-jwt/#a-name-qsh-a-creating-a-query-string-hash)
  };

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

  const newToken = AtlassianJwt.encodeSymmetric(tokenData, sharedSecret);
  console.log('newToken encodes with atlassianjwt', newToken);

  const decodedNewToken = AtlassianJwt.decodeSymmetric(
    newToken,
    sharedSecret,
    AtlassianJwt.SymmetricAlgorithm.HS256,
  );
  console.log('decoded newtoken', decodedNewToken);

  const res = await fetch('https://proceed-test.atlassian.net/wiki/api/v2/pages', {
    method: 'GET',
    headers: {
      Authorization: `JWT ${newToken}`,
    },
  });
  console.log('res', res);
  console.log('res json', await res.json());
  return res;
};

export const verifyJwt = async (jwtToken: any) => {
  const decoded = jwt.decode(jwtToken, { complete: true });
  const { iss: clientKey } = decoded!.payload as JwtPayload;

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
    return values.sharedSecret;
  })[0];

  const verified = AtlassianJwt.decodeSymmetric(
    jwtToken,
    sharedSecret,
    AtlassianJwt.SymmetricAlgorithm.HS256,
  );

  return verified;
};

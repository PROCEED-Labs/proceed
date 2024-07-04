'use server';
import jwt, { JwtPayload } from 'jsonwebtoken';
import * as AtlassianJwt from 'atlassian-jwt';

export const createAttachment = async (pageId: string, attachmentFormData: FormData) => {
  const processId = attachmentFormData.get('id');
  const processImageFile = attachmentFormData.get('image') as File;
  const processBpmn = attachmentFormData.get('bpmn') as File;

  const apiToken =
    'ATATT3xFfGF0GbPbaGHtjHkCBb-H5eOKNlIM8NBs-ofrD22TFZO7DaOauxH3ras3xrtp2cv98l27yH3kbmeWcbxDdIZpoSs27_Cy-dMcPp_GDgb8KkNpomM9pnikqhYHNbRMRkgLK7vOzcp5b21_ZAWTr4kexeXfed707-bOqXGsGqiZql9GIxc=09697613';

  const imageFormData = new FormData();
  imageFormData.append('file', processImageFile, `${processId}.png`);
  imageFormData.append('comment', 'PROCEED Process Image');

  await fetch(
    `https://proceed-test.atlassian.net/wiki/rest/api/content/${pageId}/child/attachment`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Basic ${Buffer.from(`lucasgold99@gmail.com:${apiToken}`).toString('base64')}`,
      },
      body: imageFormData,
    },
  );

  const bpmnFormData = new FormData();
  bpmnFormData.append('file', processBpmn, `${processId}.bpmn`);
  bpmnFormData.append('comment', 'PROCEED Process BPMN');

  await fetch(
    `https://proceed-test.atlassian.net/wiki/rest/api/content/${pageId}/child/attachment`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Basic ${Buffer.from(`lucasgold99@gmail.com:${apiToken}`).toString('base64')}`,
      },
      body: bpmnFormData,
    },
  );
};

export const getAttachments = async (pageId: string) => {
  const apiToken =
    'ATATT3xFfGF0GbPbaGHtjHkCBb-H5eOKNlIM8NBs-ofrD22TFZO7DaOauxH3ras3xrtp2cv98l27yH3kbmeWcbxDdIZpoSs27_Cy-dMcPp_GDgb8KkNpomM9pnikqhYHNbRMRkgLK7vOzcp5b21_ZAWTr4kexeXfed707-bOqXGsGqiZql9GIxc=09697613';
  const res = await fetch(
    `https://proceed-test.atlassian.net/wiki/rest/api/content/${pageId}/child/attachment`,
    {
      method: 'GET',
      headers: {
        Authorization: `Basic ${Buffer.from(`lucasgold99@gmail.com:${apiToken}`).toString('base64')}`,
      },
    },
  );

  return res.json();
};

export const getAttachmentProcessBase64Image = async (pageId: string, processId: string) => {
  const attachments = await getAttachments(pageId);
  console.log('attachments', attachments);
  const processAttachment = attachments.results.find(
    (attachment: { title: string }) => attachment.title === `${processId}.png`,
  );
  console.log('processAttachment', processAttachment);

  const processImageURL = `${attachments._links.base}${processAttachment._links.download}`;
  console.log('processImageURL', processImageURL);

  const apiToken =
    'ATATT3xFfGF0GbPbaGHtjHkCBb-H5eOKNlIM8NBs-ofrD22TFZO7DaOauxH3ras3xrtp2cv98l27yH3kbmeWcbxDdIZpoSs27_Cy-dMcPp_GDgb8KkNpomM9pnikqhYHNbRMRkgLK7vOzcp5b21_ZAWTr4kexeXfed707-bOqXGsGqiZql9GIxc=09697613';
  const res = await fetch(processImageURL, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${Buffer.from(`lucasgold99@gmail.com:${apiToken}`).toString('base64')}`,
    },
  });

  console.log('res', res);
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString('base64');
  console.log('base64', base64);

  return base64;
};

export const getAttachmentProcessBpmn = async (pageId: string, processId: string) => {
  const attachments = await getAttachments(pageId);
  console.log('attachments', attachments);
  const processAttachment = attachments.results.find(
    (attachment: { title: string }) => attachment.title === `${processId}.bpmn`,
  );
  console.log('processAttachment', processAttachment);

  const processBpmnURL = `${attachments._links.base}${processAttachment._links.download}`;
  console.log('processImageURL', processBpmnURL);

  const apiToken =
    'ATATT3xFfGF0GbPbaGHtjHkCBb-H5eOKNlIM8NBs-ofrD22TFZO7DaOauxH3ras3xrtp2cv98l27yH3kbmeWcbxDdIZpoSs27_Cy-dMcPp_GDgb8KkNpomM9pnikqhYHNbRMRkgLK7vOzcp5b21_ZAWTr4kexeXfed707-bOqXGsGqiZql9GIxc=09697613';
  const res = await fetch(processBpmnURL, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${Buffer.from(`lucasgold99@gmail.com:${apiToken}`).toString('base64')}`,
    },
  });

  console.log('res', res);
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const bpmn = buffer.toString('utf-8');
  console.log('bpmn', bpmn);

  return bpmn;
};

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

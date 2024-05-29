'use server';

export const getSpaces = async (jwtToken: any) => {
  console.log('jwtToken', jwtToken);
  const res = await fetch('https://proceed-test.atlassian.net/wiki/api/v2/spaces', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${jwtToken}`,
      'Content-Type': 'application/json',
    },
  });
  return res;
};

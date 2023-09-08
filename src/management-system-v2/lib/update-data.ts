const BASE_URL = process.env.API_URL;

const put = async (url: string, data = {}) => {
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-type': 'application/json',
      'x-csrf': String(1),
    },
    body: JSON.stringify(data),
  });

  const resData = await response.json();

  return resData;
};

// TODO: use schema for process to only allow updating valid properties (e.g. definitionName, description etc)
export const updateProcess = async (
  definitionId: string,
  updateProperties: { bpmn?: string; [key: string]: any },
) => {
  const url = `${BASE_URL}/process/${definitionId}`;
  const responseData = await put(url, updateProperties);
  return responseData;
};

export const createVersion = async (definitionId: string, versionProperties: { bpmn: string }) => {
  const url = `${BASE_URL}/process/${definitionId}/versions`;
  const responseData = await put(url, versionProperties);
  return responseData;
};

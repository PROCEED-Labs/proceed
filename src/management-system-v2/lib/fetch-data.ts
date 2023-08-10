const BASE_URL = process.env.API_URL;

const fetchJSON = async <T>(url: string, options = {}) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json() as Promise<T>;
};

const fetchString = async (url: string, options = {}) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }

  return response.text();
};

// We use distinct types for the collection and individual resource responses
// instead of `Item[]` because they might differ in what data they contain.

export const fetchProcesses = async () => {
  const url = `${BASE_URL}/process?noBpmn=true`;
  const data = await fetchJSON<Processes>(url);

  return data.map((process) => ({
    ...process,
    // Convert JSON dates to Date objects.
    createdOn: new Date(process.createdOn),
    lastEdited: new Date(process.lastEdited),
  }));
};

export const fetchProcess = async (definitionId: string) => {
  const url = `${BASE_URL}/process/${definitionId}`;
  return await fetchJSON<Process>(url);
};

export const fetchProcessVersionBpmn = async (definitionId: string, version: number | string) => {
  const url = `${BASE_URL}/process/${definitionId}/versions/${version}`;
  return await fetchString(url);
};

export const fetchUserData = async <User>() => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve({
        lastName: 'Mustermann',
        firstName: 'Max',
        username: 'max.mustermann',
        email: 'm.mustermann@mustermail.com',
        picture: 'https://picsum.photos/200',
      });
    }, 2_000);
  });
};

/**
 * IMPORTANT
 *
 * The following types are only temporary until we have converted the API to the
 * new NextJS framework. These types should ideally be automatically generated
 * from the database schema (e.g. using Prisma).
 */

export type User = {
  // id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  picture: string;
};

export type Process = {
  type: 'process';
  description: string;
  owner: string | null;
  processIds: string[];
  variables: [];
  departments: [];
  inEditingBy: [];
  createdOn: Date;
  lastEdited: Date;
  shared: boolean;
  versions: { version: number | string; name: string; description: string }[];
  definitionId: string;
  definitionName: string;
  bpmn?: string;
};

export type Processes = Process[];

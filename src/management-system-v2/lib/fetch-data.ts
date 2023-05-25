import { Immutable } from 'immer';

const BASE_URL = process.env.API_URL;

const fetchJSON = async <T>(url: string, options = {}) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json() as Promise<T>;
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

/**
 * IMPORTANT
 *
 * The following types are only temporary until we have converted the API to the
 * new NextJS framework. These types should ideally be automatically generated
 * from the database schema (e.g. using Prisma).
 */

export type Processes = {
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
  versions: [];
  definitionId: string;
  definitionName: string;
}[];

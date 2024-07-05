'use server';

import { updateConfluenceClientInfos } from './legacy/fileHandling';

export const updateConfluenceClientSelectedSpace = async (
  clientKey: string,
  selectedSpace: string,
) => {
  await updateConfluenceClientInfos(clientKey, { proceedSpace: selectedSpace });
};

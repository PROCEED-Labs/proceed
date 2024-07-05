'use server';

import { updateConfluenceClientInfos, getConfluenceClientInfos } from './legacy/fileHandling';

export const updateConfluenceClientSelectedSpace = async (
  clientKey: string,
  selectedSpace: string,
) => {
  await updateConfluenceClientInfos(clientKey, { proceedSpace: selectedSpace });
};

export const getConfluenceClientSelectedSpace = async (clientKey: string) => {
  const confluenceClientInfos = await getConfluenceClientInfos(clientKey);
  return confluenceClientInfos.proceedSpace;
};

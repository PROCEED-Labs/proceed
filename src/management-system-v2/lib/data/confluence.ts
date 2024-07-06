'use server';

import { updateConfluenceClientInfos, getConfluenceClientInfos } from './legacy/fileHandling';

export const updateConfluenceClientSelectedSpace = async (
  clientKey: string,
  selectedSpaceInfo: { id: string; confluenceFolderId: string },
) => {
  await updateConfluenceClientInfos(clientKey, { proceedSpace: selectedSpaceInfo });
};

export const getConfluenceClientSelectedSpace = async (clientKey: string) => {
  const confluenceClientInfos = await getConfluenceClientInfos(clientKey);
  return confluenceClientInfos.proceedSpace;
};

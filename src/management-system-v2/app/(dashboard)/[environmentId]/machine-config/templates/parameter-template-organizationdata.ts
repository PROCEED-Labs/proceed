import { defaultParameter } from '../helpers/configuration-helper';

export function createOrgOrganizationDataParameter() {
  const dataParameter = defaultParameter({
    name: 'data',
    displayName: [{ text: 'Data', language: 'en' }],
  });

  return defaultParameter({
    name: 'organization',
    displayName: [{ text: 'Organization', language: 'en' }],
    subParameters: [dataParameter],
  });
}

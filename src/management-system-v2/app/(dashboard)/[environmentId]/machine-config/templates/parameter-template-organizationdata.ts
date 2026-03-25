import { defaultParameter } from '../helpers/configuration-helper';

export function createOrgOrganizationDataParameter() {
  const organizationParameter = defaultParameter(
    'organization',
    [{ text: 'Organization', language: 'en' }],
    [],
  );
  const dataParameter = defaultParameter('data', [{ text: 'Data', language: 'en' }], []);

  dataParameter.subParameters = [];
  organizationParameter.subParameters = [dataParameter];
  return organizationParameter;
}

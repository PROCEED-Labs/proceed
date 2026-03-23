import { Config } from '@/lib/data/machine-config-schema';

import { defaultConfiguration, defaultParameter } from './configuration-helper';

//------------ Organization Template ------------

export function defaultOrganizationConfigurationTemplate(
  environmentId: string,
  name: string,
): Config {
  const organizationConfig = defaultConfiguration(environmentId, `${name} Data Objects`, name);
  const organizationParameter = createOrgConfigTemplateOrganization();
  const iamParameter = createOrgConfigTemplateIam();
  organizationConfig.content = [organizationParameter, iamParameter];
  organizationConfig.id = environmentId;
  organizationConfig.configType = 'organization';
  return organizationConfig;
}

function createOrgConfigTemplateOrganization() {
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

function createOrgConfigTemplateIam() {
  const iamParameter = defaultParameter(
    'identity-and-access-management',
    [{ text: 'IAM', language: 'en' }],
    [],
  );
  const userParameter = defaultParameter('user', [{ text: 'User', language: 'en' }], []);
  const commonUserDataParameter = defaultParameter(
    'common-user-data',
    [{ text: 'Common User Data', language: 'en' }],
    [],
  );

  iamParameter.subParameters = [commonUserDataParameter, userParameter];
  return iamParameter;
}

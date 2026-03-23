import { Config, VirtualOrganizationRolesParameter } from '@/lib/data/machine-config-schema';

import { defaultConfiguration, defaultParameter } from './configuration-helper';

//------------ Organization Template ------------

export function defaultOrganizationConfigurationTemplate(
  environmentId: string,
  name: string,
): Config {
  const organizationConfig = defaultConfiguration(environmentId, `${name} Data Objects`, name);
  const organizationParameter = createOrgConfigTemplateOrganization();
  const iamParameter = createOrgConfigTemplateIam(environmentId);
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

function createOrgConfigTemplateIam(environmentId: string) {
  const iamParameter = defaultParameter(
    'identity-and-access-management',
    [{ text: 'IAM', language: 'en' }],
    [],
  );
  const commonUserDataParameter = defaultParameter(
    'common-user-data',
    [{ text: 'Common User Data', language: 'en' }],
    [],
  );
  const userParameter = defaultParameter('user', [{ text: 'User', language: 'en' }], []);
  const rolesParameter: VirtualOrganizationRolesParameter = {
    ...defaultParameter('roles', [{ text: 'Roles', language: 'en' }], []),
    environmentId,
    virtualType: 'org-roles',
  };

  iamParameter.subParameters = [commonUserDataParameter, userParameter, rolesParameter];
  return iamParameter;
}

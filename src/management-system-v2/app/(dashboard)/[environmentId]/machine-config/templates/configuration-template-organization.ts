import { Config } from '@/lib/data/machine-config-schema';

import { defaultConfiguration } from '../helpers/configuration-helper';
import { createOrgIamParameter } from './parameter-template-iam';
import { createOrgOrganizationDataParameter } from './parameter-template-organizationdata';

//------------ Organization Template ------------

export function defaultOrganizationConfigurationTemplate(
  environmentId: string,
  name: string,
): Config {
  const organizationConfig = defaultConfiguration(environmentId, `${name} Data Objects`, name);
  const organizationParameter = createOrgOrganizationDataParameter();
  const iamParameter = createOrgIamParameter(environmentId);
  organizationConfig.content = [organizationParameter, iamParameter];
  organizationConfig.id = environmentId;
  organizationConfig.configType = 'organization';
  return organizationConfig;
}

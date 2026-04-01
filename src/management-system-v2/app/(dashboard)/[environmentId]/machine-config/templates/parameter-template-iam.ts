import { VirtualOrganizationRolesParameter } from '@/lib/data/machine-config-schema';
import { defaultParameter } from '../helpers/configuration-helper';

export function createOrgIamParameter(environmentId: string) {
  const commonUserDataParameter = defaultParameter({
    name: 'common-user-data',
    displayName: [{ text: 'Common User Data', language: 'en' }],
  });
  const userParameter = defaultParameter({
    name: 'user',
    displayName: [{ text: 'User', language: 'en' }],
  });
  const rolesParameter: VirtualOrganizationRolesParameter = {
    ...defaultParameter({ name: 'roles', displayName: [{ text: 'Roles', language: 'en' }] }),
    environmentId,
    virtualType: 'org-roles',
  };

  return defaultParameter({
    name: 'identity-and-access-management',
    displayName: [{ text: 'IAM', language: 'en' }],
    subParameters: [commonUserDataParameter, userParameter, rolesParameter],
  });
}

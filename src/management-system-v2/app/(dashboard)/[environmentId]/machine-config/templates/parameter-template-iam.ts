import { VirtualOrganizationRolesParameter } from '@/lib/data/machine-config-schema';
import { defaultParameter } from '../helpers/configuration-helper';

export function createOrgIamParameter(environmentId: string) {
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

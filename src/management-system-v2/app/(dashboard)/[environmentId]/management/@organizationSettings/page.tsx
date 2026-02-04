import { getCurrentEnvironment } from '@/components/auth';
import { getEnvironmentById } from '@/lib/data/db/iam/environments';
import { OrganizationEnvironment } from '@/lib/data/environment-schema';
import Wrapper from './wrapper';
import { Setting, SettingGroup } from '../../settings/type-util';
import SettingsInjector from '../../settings/settings-injector';
import { UnauthorizedError } from '@/lib/ability/abilityHelper';
import { env } from '@/lib/ms-config/env-vars';

const GeneralSettingsPage = async (props: { params: Promise<{ environmentId: string }> }) => {
  const params = await props.params;
  const { ability, activeEnvironment } = await getCurrentEnvironment(params.environmentId);
  if (
    !activeEnvironment.isOrganization ||
    (!ability.can('update', 'Environment') && !ability.can('delete', 'Environment'))
  ) {
    throw new UnauthorizedError();
  }

  const organization = (await getEnvironmentById(
    activeEnvironment.spaceId,
  )) as OrganizationEnvironment;

  const children: (Setting | SettingGroup)[] = [];
  if (ability.can('update', 'Environment')) {
    children.push({
      key: 'organizationDetails',
      name: 'Information',
      children: [
        {
          key: 'name',
          name: 'Name',
          value: organization.name,
          type: 'string',
        },

        {
          key: 'description',
          name: 'Description',
          value: organization.description,
          type: 'string',
        },
        {
          key: 'contactPhoneNumber',
          name: 'Contact Phone Number',
          value: organization.contactPhoneNumber || '',
          type: 'string',
        },
        {
          key: 'contactEmail',
          name: 'Contact E-Mail',
          value: organization.contactEmail || '',
          type: 'string',
        },
      ],
    });
  }

  if (
    !env.PROCEED_PUBLIC_IAM_ONLY_ONE_ORGANIZATIONAL_SPACE &&
    ability.can('delete', 'Environment')
  ) {
    children.push({
      key: 'deleteOrganization',
      name: 'Delete Organization',
      children: [
        {
          key: 'deleteOrganization',
          name: 'Delete Organization',
          value: null,
          type: 'custom',
        },
      ],
    });
  }

  const settings: SettingGroup = {
    key: 'organizationSettings',
    name: 'Organization Settings',
    children: children,
  };

  return (
    <>
      <SettingsInjector sectionName="organizationSettings" group={settings} priority={2000} />

      <Wrapper group={settings} />
    </>
  );
};

export default GeneralSettingsPage;

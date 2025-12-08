import { populateSpaceSettingsGroup } from '@/lib/data/db/space-settings';
import { getCurrentEnvironment } from '@/components/auth';
import SettingsInjector from '../settings-injector';
import { SettingGroup } from '../type-util';
import Wrapper from './wrapper';
import db from '@/lib/data/db';
import { SpaceNotFoundError } from '@/lib/server-error-handling/errors';

const Page = async ({ params }: { params: { environmentId: string } }) => {
  const {
    ability,
    activeEnvironment: { spaceId },
  } = await getCurrentEnvironment(params.environmentId);
  //if (!ability.can('update', 'Environment')) return null;

  const spaceLogo = await db.space.findUnique({
    where: { id: spaceId },
    select: { spaceLogo: true },
  });
  if (!spaceLogo) throw new SpaceNotFoundError();

  // NOTE: beware when changing the structure of space logo, the client component sort of relies on
  // it
  const settings: SettingGroup = {
    key: 'general-settings',
    name: 'General Settings',
    children: [
      {
        key: 'spaceLogo',
        name: 'Space Logo',
        children: [
          {
            key: 'logo',
            name: '',
            type: 'custom',
            description: 'The logo that is displayed in the top left corner of the space.',
            value: spaceLogo.spaceLogo,
          },
        ],
      },
      {
        key: 'customNavigationLinks',
        name: 'Custom Navigation Links',
        children: [
          {
            key: 'links',
            name: '',
            type: 'custom',
            description: 'Pinned links',
            value: [],
          },
        ],
      },
    ],
  };

  // Read config values from the db and write them to the settings object
  await populateSpaceSettingsGroup(spaceId, settings);

  return (
    <>
      <SettingsInjector sectionName="generalSettings" group={settings} priority={1000} />
      <Wrapper group={settings} />
    </>
  );
};

export default Page;

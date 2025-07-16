import { populateSpaceSettingsGroup } from '@/lib/data/db/space-settings';
import { getCurrentEnvironment } from '@/components/auth';
import SettingsInjector from '../settings-injector';
import Wrapper from './wrapper';
import { settings } from './settings';

const Page = async ({ params }: { params: { environmentId: string } }) => {
  const {
    activeEnvironment: { spaceId },
  } = await getCurrentEnvironment(params.environmentId);

  await populateSpaceSettingsGroup(spaceId, settings);

  return (
    <>
      <SettingsInjector sectionName="processDocumentation" group={settings} priority={1000} />
      <Wrapper group={settings} />
    </>
  );
};

export default Page;

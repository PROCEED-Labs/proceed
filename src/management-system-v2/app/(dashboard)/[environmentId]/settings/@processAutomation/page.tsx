import { env } from '@/lib/env-vars';
import { populateSpaceSettingsGroup } from '@/lib/data/db/space-settings';
import { getCurrentEnvironment } from '@/components/auth';
import SettingsInjector from '../settings-injector';
import { settings } from './settings';
import Wrapper from './wrapper';

const Page = async ({ params }: { params: { environmentId: string } }) => {
  if (!env.PROCEED_PUBLIC_ENABLE_EXECUTION) return null;

  const {
    ability,
    activeEnvironment: { spaceId },
  } = await getCurrentEnvironment(params.environmentId);

  await populateSpaceSettingsGroup(spaceId, settings, ability);

  return (
    <>
      <SettingsInjector sectionName="processAutomation" group={settings} priority={900} />
      <Wrapper group={settings} />
    </>
  );
};

export default Page;

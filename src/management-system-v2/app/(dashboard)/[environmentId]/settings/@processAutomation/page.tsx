import { populateSpaceSettingsGroup } from '@/lib/data/db/space-settings';
import { getCurrentEnvironment } from '@/components/auth';
import SettingsInjector from '../settings-injector';
import { settings } from './settings';
import Wrapper from './wrapper';
import { getMSConfig } from '@/lib/ms-config/ms-config';

const Page = async (props: { params: Promise<{ environmentId: string }> }) => {
  const params = await props.params;
  const msConfig = await getMSConfig();
  if (!msConfig.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE) return null;

  const {
    ability,
    activeEnvironment: { spaceId },
  } = await getCurrentEnvironment(params.environmentId);

  await populateSpaceSettingsGroup(spaceId, settings);

  return (
    <>
      <SettingsInjector sectionName="processAutomation" group={settings} priority={900} />
      <Wrapper group={settings} />
    </>
  );
};

export default Page;

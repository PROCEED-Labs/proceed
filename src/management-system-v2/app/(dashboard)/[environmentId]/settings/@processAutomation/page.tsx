import { populateSpaceSettingsGroup } from '@/lib/data/db/space-settings';
import { getCurrentEnvironment } from '@/components/auth';
import SettingsInjector from '../settings-injector';
import { settings } from './settings';
import Wrapper from './wrapper';
import { getMSConfig } from '@/lib/ms-config/ms-config';
import { errorResponse } from '@/lib/server-error-handling/page-error-response';

const Page = async ({ params }: { params: { environmentId: string } }) => {
  const msConfig = await getMSConfig();
  if (!msConfig.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE) return null;

  const currentSpace = await getCurrentEnvironment(params.environmentId);
  if (currentSpace.isErr()) {
    return errorResponse(currentSpace);
  }
  const {
    ability,
    activeEnvironment: { spaceId },
  } = currentSpace.value;

  await populateSpaceSettingsGroup(spaceId, settings);

  return (
    <>
      <SettingsInjector sectionName="processAutomation" group={settings} priority={900} />
      <Wrapper group={settings} />
    </>
  );
};

export default Page;

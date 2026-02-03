import { populateSpaceSettingsGroup } from '@/lib/data/db/space-settings';
import { getCurrentEnvironment } from '@/components/auth';
import SettingsInjector from '../settings-injector';
import { settings } from './settings';
import Wrapper from './wrapper';
import { getMSConfig } from '@/lib/ms-config/ms-config';
import { errorResponse } from '@/lib/server-error-handling/page-error-response';

const Page = async (props: { params: Promise<{ environmentId: string }> }) => {
  const params = await props.params;
  const msConfig = await getMSConfig();
  if (!msConfig.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE) return null;

  const currentSpace = await getCurrentEnvironment(params.environmentId);
  if (currentSpace.isErr()) {
    return errorResponse(currentSpace);
  }
  const {
    activeEnvironment: { spaceId },
  } = currentSpace.value;

  const res = await populateSpaceSettingsGroup(spaceId, settings);
  if (res.isErr()) return errorResponse(res);

  return (
    <>
      <SettingsInjector sectionName="processAutomation" group={settings} priority={900} />
      <Wrapper group={settings} />
    </>
  );
};

export default Page;

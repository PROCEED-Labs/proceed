import { populateSpaceSettingsGroup } from '@/lib/data/db/space-settings';
import { getCurrentEnvironment } from '@/components/auth';
import SettingsInjector from '../settings-injector';
import Wrapper from './wrapper';
import { getSettings } from './settings';
import { errorResponse } from '@/lib/server-error-handling/page-error-response';

const Page = async ({ params }: { params: { environmentId: string } }) => {
  const currentSpace = await getCurrentEnvironment(params.environmentId);
  if (currentSpace.isErr()) {
    return errorResponse(currentSpace);
  }
  const {
    activeEnvironment: { spaceId },
  } = currentSpace.value;

  const settings = await getSettings();
  await populateSpaceSettingsGroup(spaceId, settings);

  return (
    <>
      <SettingsInjector sectionName="processDocumentation" group={settings} priority={1000} />
      <Wrapper group={settings} />
    </>
  );
};

export default Page;

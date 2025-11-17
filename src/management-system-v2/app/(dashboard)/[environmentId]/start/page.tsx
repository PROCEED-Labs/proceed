import Content from '@/components/content';
import { getMSConfig } from '@/lib/ms-config/ms-config';
import { MyTasksSection, ProcessesSection, AutomationsSection, PersonalSection, HomeSection } from './sections';
import FavoriteProcessesSection from './favorite-processes-section';
import { getCurrentEnvironment } from '@/components/auth';
import { getUsersFavourites } from '@/lib/data/users';
import { getProcesses } from '@/lib/data/db/process';

const StartPage = async ({ params }: { params: { environmentId: string } }) => {
  const msConfig = await getMSConfig();

  // Get favorite processes if process documentation is active
  let favoriteProcesses: { id: string; name: string }[] = [];
  if (msConfig.PROCEED_PUBLIC_PROCESS_DOCUMENTATION_ACTIVE) {
    const { ability, activeEnvironment } = await getCurrentEnvironment(params.environmentId);
    const favs = await getUsersFavourites();

    if (favs && favs.length > 0) {
      const allProcesses = await getProcesses(activeEnvironment.spaceId, ability, false);
      favoriteProcesses = allProcesses
        .filter((process) => favs.includes(process.id))
        .map((process) => ({ id: process.id, name: process.name }));
    }
  }

  return (
    <Content>
      <h1>Welcome to PROCEED</h1>
      {msConfig.PROCEED_PUBLIC_PROCESS_DOCUMENTATION_ACTIVE && favoriteProcesses.length > 0 && (
        <FavoriteProcessesSection processes={favoriteProcesses} />
      )}
      {msConfig.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE && <MyTasksSection />}
      {msConfig.PROCEED_PUBLIC_PROCESS_DOCUMENTATION_ACTIVE && <ProcessesSection />}
      {msConfig.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE && <AutomationsSection />}
      <PersonalSection />
      <HomeSection />
    </Content>
  );
};

export default StartPage;

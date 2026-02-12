import Content from '@/components/content';
import { getMSConfig } from '@/lib/ms-config/ms-config';
import {
  MyTasksSection,
  ProcessesSection,
  AutomationsSection,
  PersonalSection,
  HomeSection,
} from './sections';
import FavoriteProcessesSection from './favorite-processes-section';
import { getCurrentEnvironment } from '@/components/auth';
import { getUsersFavourites } from '@/lib/data/users';
import { getProcesses } from '@/lib/data/db/process';
import styles from './page.module.scss';
import ResponsiveGrid from './responsive-grid';
import { getSpaceSettingsValues } from '@/lib/data/space-settings';
import { isUserErrorResponse } from '@/lib/user-error';
import { notFound } from 'next/navigation';

const StartPage = async ({ params }: { params: Promise<{ environmentId: string }> }) => {
  const { environmentId } = await params;
  const msConfig = await getMSConfig();

  const {
    activeEnvironment: { spaceId },
  } = await getCurrentEnvironment(environmentId);

  const documentationSettings = await getSpaceSettingsValues(spaceId, 'process-documentation');

  if (isUserErrorResponse(documentationSettings)) return notFound();

  const automationSettings = await getSpaceSettingsValues(spaceId, 'process-automation');

  if (isUserErrorResponse(automationSettings)) return notFound();

  const {
    PROCEED_PUBLIC_PROCESS_DOCUMENTATION_ACTIVE,
    PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE,
    PROCEED_PUBLIC_PROCESS_AUTOMATION_TASK_EDITOR_ACTIVE,
  } = msConfig;

  // Get favorite processes if process documentation is active
  let favoriteProcesses: { id: string; name: string; lastEditedOn: Date }[] = [];
  if (PROCEED_PUBLIC_PROCESS_DOCUMENTATION_ACTIVE) {
    const { ability, activeEnvironment } = await getCurrentEnvironment(environmentId);
    const favs = await getUsersFavourites();

    if (favs && favs.length > 0) {
      const allProcesses = await getProcesses(activeEnvironment.spaceId, ability, false);
      favoriteProcesses = allProcesses
        .filter((process) => favs.includes(process.id))
        .map((process) => ({
          id: process.id,
          name: process.name,
          lastEditedOn: process.lastEditedOn,
        }));
    }
  }

  const showDocumentation =
    !!PROCEED_PUBLIC_PROCESS_DOCUMENTATION_ACTIVE && documentationSettings?.active !== false;

  const showProcessList = showDocumentation && documentationSettings?.list?.active !== false;
  const showProcessEditor = showDocumentation && documentationSettings?.editor?.active !== false;

  const showDocumentationSection = showDocumentation && (showProcessList || showProcessEditor);

  const showAutomations =
    !!PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE && automationSettings?.active !== false;

  const showDashboard = showAutomations && automationSettings?.dashboard?.active !== false;
  const showExecutions = showAutomations && automationSettings?.executions?.active !== false;
  const showEngines = showAutomations && automationSettings['process-engines']?.active !== false;

  const showAutomationSection = showAutomations && (showDashboard || showExecutions || showEngines);

  const showTasksSection = showAutomations && automationSettings?.tasklist?.active !== false;

  const showTaskEditor =
    showTasksSection &&
    !!PROCEED_PUBLIC_PROCESS_AUTOMATION_TASK_EDITOR_ACTIVE &&
    automationSettings?.task_editor?.active !== false;

  return (
    <Content wrapperClass={styles.wrapper}>
      <h1>Welcome to PROCEED</h1>
      {PROCEED_PUBLIC_PROCESS_DOCUMENTATION_ACTIVE && favoriteProcesses.length > 0 && (
        <FavoriteProcessesSection processes={favoriteProcesses} />
      )}
      <ResponsiveGrid>
        {showTasksSection && <MyTasksSection showTaskEditor={showTaskEditor} />}
        {showDocumentationSection && (
          <ProcessesSection showList={showProcessList} showEditor={showProcessEditor} />
        )}
        {showAutomationSection && (
          <AutomationsSection
            showDashboard={showDashboard}
            showExecutions={showExecutions}
            showEngines={showEngines}
          />
        )}
        <PersonalSection />
        <HomeSection />
      </ResponsiveGrid>
    </Content>
  );
};

export default StartPage;

import Content from '@/components/content';
import { getMSConfig } from '@/lib/ms-config/ms-config';
import {
  AutomationSection,
  ExecutionDashboardTile,
  ProcessEditorTile,
  ProcessEngineTile,
  ProcessExecutionsTile,
  ProcessListTile,
  ProcessSection,
  SettingsTile,
  TaskEditorTile,
  TaskListTile,
  TaskSection,
  UserProfileTile,
  UserSection,
  UserSpaceSection,
  UserSpacesTile,
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

import { truthyFilter } from '@/lib/typescript-utils';

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

  const sections = [
    PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE &&
      automationSettings.active !== false &&
      automationSettings?.tasklist?.active !== false && (
        <TaskSection
          key="task"
          tiles={[
            <TaskListTile key="list" />,
            PROCEED_PUBLIC_PROCESS_AUTOMATION_TASK_EDITOR_ACTIVE &&
              automationSettings?.task_editor?.active !== false && <TaskEditorTile key="editor" />,
          ]}
        />
      ),
    PROCEED_PUBLIC_PROCESS_DOCUMENTATION_ACTIVE && documentationSettings?.active !== false && (
      <ProcessSection
        key="process"
        tiles={[
          documentationSettings?.editor?.active !== false && <ProcessEditorTile key="editor" />,
          documentationSettings?.list?.active !== false && <ProcessListTile key="list" />,
        ]}
      />
    ),
    !!PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE && automationSettings?.active !== false && (
      <AutomationSection
        key="automation"
        tiles={[
          automationSettings?.dashboard?.active !== false && (
            <ExecutionDashboardTile key="dashboard" />
          ),
          automationSettings?.executions?.active !== false && (
            <ProcessExecutionsTile key="executions" />
          ),
          automationSettings?.['process-engines']?.active !== false && (
            <ProcessEngineTile key="engines" />
          ),
        ]}
      />
    ),
    <UserSection
      key="user"
      tiles={[<UserProfileTile key="profile" />, <UserSpacesTile key="spaces" />]}
    />,
    <UserSpaceSection key="home" tiles={[<SettingsTile key="settings" />]} />,
  ].filter(truthyFilter);

  return (
    <Content wrapperClass={styles.wrapper}>
      <h1>Welcome to PROCEED</h1>
      {PROCEED_PUBLIC_PROCESS_DOCUMENTATION_ACTIVE && favoriteProcesses.length > 0 && (
        <FavoriteProcessesSection processes={favoriteProcesses} />
      )}
      <ResponsiveGrid>{...sections}</ResponsiveGrid>
    </Content>
  );
};

export default StartPage;

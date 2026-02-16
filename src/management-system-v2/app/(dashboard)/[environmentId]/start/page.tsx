import Content from '@/components/content';
import { getMSConfig } from '@/lib/ms-config/ms-config';
import Section from './sections';
import FavoriteProcessesSection from './favorite-processes-section';
import { getCurrentEnvironment } from '@/components/auth';
import { getUsersFavourites } from '@/lib/data/users';
import { getProcesses } from '@/lib/data/db/process';
import styles from './page.module.scss';
import ResponsiveGrid from './responsive-grid';
import { getSpaceSettingsValues } from '@/lib/data/space-settings';
import { isUserErrorResponse } from '@/lib/user-error';
import { notFound } from 'next/navigation';

import {
  CheckSquareOutlined,
  EditOutlined,
  PartitionOutlined,
  CopyOutlined,
  PlaySquareOutlined,
  BarChartOutlined,
  NodeExpandOutlined,
  LaptopOutlined,
  FormOutlined,
  AppstoreOutlined,
  UserOutlined,
  HomeOutlined,
  SettingOutlined,
} from '@ant-design/icons';
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
    {
      title: 'My Tasks',
      description: (
        <p>
          Manage your running or planned tasks in the Task List.<br></br>
          Edit your existing tasks using the Task Editor.
        </p>
      ),
      icon: <CheckSquareOutlined />,
      tiles: [
        {
          title: 'Task List',
          href: `/tasklist`,
          icon: <CheckSquareOutlined />,
        },
        {
          title: 'Task Editor',
          href: `/tasks`,
          icon: <FormOutlined />,
          env: PROCEED_PUBLIC_PROCESS_AUTOMATION_TASK_EDITOR_ACTIVE,
          setting: automationSettings?.task_editor?.active !== false,
        },
      ],
      env: PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE,
      setting:
        automationSettings.active !== false && automationSettings?.tasklist?.active !== false,
    },
    {
      title: 'My Processes',
      description: (
        <p>
          Create, edit and organize your BPMN processes with the Process Editor. <br></br>
          Browse already versioned, released processes in the Process List
        </p>
      ),
      icon: <PartitionOutlined />,
      tiles: [
        {
          title: 'Process Editor',
          href: `/processes/editor`,
          icon: <EditOutlined />,
          setting: documentationSettings?.editor?.active !== false,
        },
        {
          title: 'Process List',
          href: `/processes/list`,
          icon: <CopyOutlined />,
          setting: documentationSettings?.list?.active !== false,
        },
      ],
      env: PROCEED_PUBLIC_PROCESS_DOCUMENTATION_ACTIVE,
      setting: documentationSettings?.active !== false,
    },
    {
      title: 'Automations',
      description: (
        <p>
          Observe your running automations on the Dashboard, deploy your automation processes
          <br></br>in the Executions tab, and manage your connected engines in Process Engines.
        </p>
      ),
      icon: <PlaySquareOutlined />,
      tiles: [
        {
          title: 'Dashboard',
          href: `/executions-dashboard`,
          icon: <BarChartOutlined />,
          setting: automationSettings?.dashboard?.active !== false,
        },
        {
          title: 'Executions',
          href: `/executions`,
          icon: <NodeExpandOutlined />,
          setting: automationSettings?.executions?.active !== false,
        },
        {
          title: 'Process Engines',
          href: `/engines`,
          icon: <LaptopOutlined />,
          setting: automationSettings?.['process-engines']?.active !== false,
        },
      ],
      env: !!PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE,
      setting: automationSettings?.active !== false,
    },
    {
      title: 'Personal',
      description: (
        <p>
          Change your user profile information or<br></br>
          manage the different personal spaces you created.
        </p>
      ),
      icon: <UserOutlined />,
      tiles: [
        {
          title: 'My Profile',
          href: `/profile`,
          icon: <UserOutlined />,
        },
        {
          title: 'My Spaces',
          href: `/spaces`,
          icon: <AppstoreOutlined />,
        },
      ],
    },
    {
      title: 'Home',
      description: (
        <p>
          Adjust the visual settings of your space <br></br>
          and create custom navigation links for easier access.
        </p>
      ),
      icon: <HomeOutlined />,
      tiles: [
        {
          title: 'Settings',
          href: `/settings`,
          icon: <SettingOutlined />,
        },
      ],
    },
  ]
    .map((section) => {
      if ('env' in section && !section.env) return null;
      if ('setting' in section && !section.setting) return null;

      const tiles = section.tiles.filter((tile) => {
        if ('env' in tile && !tile.env) return false;
        if ('setting' in tile) return !!tile.setting;
        return true;
      });

      if (!tiles.length) return null;

      return (
        <Section
          key={section.title}
          title={section.title}
          description={section.description}
          icon={section.icon}
          tiles={tiles}
        />
      );
    })
    .filter(truthyFilter);

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

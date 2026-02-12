'use client';

import Link from 'next/link';
import { Card } from 'antd';
import { useParams } from 'next/navigation';
import { CheckSquareOutlined, EditOutlined } from '@ant-design/icons';
import { PartitionOutlined, CopyOutlined } from '@ant-design/icons';
import {
  PlaySquareOutlined,
  BarChartOutlined,
  NodeExpandOutlined,
  LaptopOutlined,
  FormOutlined,
} from '@ant-design/icons';
import { AppstoreOutlined } from '@ant-design/icons';
import { UserOutlined } from '@ant-design/icons';
import { HomeOutlined, SettingOutlined } from '@ant-design/icons';

import styles from './sections.module.scss';

type MyTasksSectionProps = {
  showTaskEditor: boolean;
};

const MyTasksSection: React.FC<MyTasksSectionProps> = ({ showTaskEditor }) => {
  const params = useParams();
  const environmentId = params.environmentId as string;

  const tiles = [
    {
      title: 'Task List',
      href: `/${environmentId}/tasklist`,
      icon: <CheckSquareOutlined className={styles.TileIcon} />,
      condition: true,
    },
    {
      title: 'Task Editor',
      href: `/${environmentId}/tasks`,
      icon: <FormOutlined className={styles.TileIcon} />,
      condition: showTaskEditor,
    },
  ];

  return (
    <div className={styles.Section}>
      <h2>
        <CheckSquareOutlined className={styles.SectionIcon} />
        My Tasks
      </h2>
      <p>
        Manage your running or planned tasks in the Task List.<br></br>
        Edit your existing tasks using the Task Editor.
      </p>
      <div className={styles.TileGroup}>
        {tiles.map(
          (tile) =>
            tile.condition && (
              <Link key={tile.title} href={tile.href} className={styles.Tile}>
                <Card hoverable className={styles.TileCard}>
                  {tile.icon}
                  <h3 className={styles.TileCardTitle}>{tile.title}</h3>
                </Card>
              </Link>
            ),
        )}
      </div>
    </div>
  );
};

type ProcessSectionProps = {
  showList: boolean;
  showEditor: boolean;
};

const ProcessesSection: React.FC<ProcessSectionProps> = ({ showList, showEditor }) => {
  const params = useParams();
  const environmentId = params.environmentId as string;

  const tiles = [
    {
      title: 'Process Editor',
      href: `/${environmentId}/processes/editor`,
      icon: <EditOutlined className={styles.TileIcon} />,
      condition: showEditor,
    },
    {
      title: 'Process List',
      href: `/${environmentId}/processes/list`,
      icon: <CopyOutlined className={styles.TileIcon} />,
      condition: showList,
    },
  ];

  return (
    <div className={styles.Section}>
      <h2>
        <PartitionOutlined className={styles.SectionIcon} />
        My Processes
      </h2>
      <p>
        Create, edit and organize your BPMN processes with the Process Editor. <br></br>
        Browse already versioned, released processes in the Process List
      </p>
      <div className={styles.TileGroup}>
        {tiles.map(
          (tile) =>
            tile.condition && (
              <Link key={tile.title} href={tile.href} className={styles.Tile}>
                <Card hoverable className={styles.TileCard}>
                  {tile.icon}
                  <h3 className={styles.TileCardTitle}>{tile.title}</h3>
                </Card>
              </Link>
            ),
        )}
      </div>
    </div>
  );
};

type AutomationSectionProps = {
  showDashboard: boolean;
  showExecutions: boolean;
  showEngines: boolean;
};

const AutomationsSection: React.FC<AutomationSectionProps> = ({
  showDashboard,
  showExecutions,
  showEngines,
}) => {
  const params = useParams();
  const environmentId = params.environmentId as string;

  const tiles = [
    {
      title: 'Dashboard',
      href: `/${environmentId}/executions-dashboard`,
      icon: <BarChartOutlined className={styles.TileIcon} />,
      condition: showDashboard,
    },
    {
      title: 'Executions',
      href: `/${environmentId}/executions`,
      icon: <NodeExpandOutlined className={styles.TileIcon} />,
      condition: showExecutions,
    },
    {
      title: 'Process Engines',
      href: `/${environmentId}/engines`,
      icon: <LaptopOutlined className={styles.TileIcon} />,
      condition: showEngines,
    },
  ];

  return (
    <div className={styles.Section}>
      <h2>
        <PlaySquareOutlined className={styles.SectionIcon} />
        Automations
      </h2>
      <p>
        Observe your running automations on the Dashboard, deploy your automation processes
        <br></br>in the Executions tab, and manage your connected engines in Process Engines.
      </p>
      <div className={styles.TileGroup}>
        {tiles.map(
          (tile) =>
            tile.condition && (
              <Link key={tile.title} href={tile.href} className={styles.Tile}>
                <Card hoverable className={styles.TileCard}>
                  {tile.icon}
                  <h3 className={styles.TileCardTitle}>{tile.title}</h3>
                </Card>
              </Link>
            ),
        )}
      </div>
    </div>
  );
};

const PersonalSection = () => {
  const params = useParams();
  const environmentId = params.environmentId as string;

  const tiles = [
    {
      title: 'My Profile',
      href: `/${environmentId}/profile`,
      icon: <UserOutlined className={styles.TileIcon} />,
    },
    {
      title: 'My Spaces',
      href: `/${environmentId}/spaces`,
      icon: <AppstoreOutlined className={styles.TileIcon} />,
    },
  ];

  return (
    <div className={styles.Section}>
      <h2>
        <UserOutlined className={styles.SectionIcon} />
        Personal
      </h2>
      <p>
        Change your user profile information or<br></br>
        manage the different personal spaces you created.
      </p>
      <div className={styles.TileGroup}>
        {tiles.map((tile) => (
          <Link key={tile.title} href={tile.href} className={styles.Tile}>
            <Card hoverable className={styles.TileCard}>
              {tile.icon}
              <h3 className={styles.TileCardTitle}>{tile.title}</h3>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

const HomeSection = () => {
  const params = useParams();
  const environmentId = params.environmentId as string;

  const tiles = [
    {
      title: 'Settings',
      href: `/${environmentId}/settings`,
      icon: <SettingOutlined className={styles.TileIcon} />,
    },
  ];

  return (
    <div className={styles.Section}>
      <h2>
        <HomeOutlined className={styles.SectionIcon} />
        Home
      </h2>
      <p>
        Adjust the visual settings of your space <br></br>
        and create custom navigation links for easier access.
      </p>
      <div className={styles.TileGroup}>
        {tiles.map((tile) => (
          <Link key={tile.title} href={tile.href} className={styles.Tile}>
            <Card hoverable className={styles.TileCard}>
              {tile.icon}
              <h3 className={styles.TileCardTitle}>{tile.title}</h3>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export { MyTasksSection, ProcessesSection, AutomationsSection, PersonalSection, HomeSection };

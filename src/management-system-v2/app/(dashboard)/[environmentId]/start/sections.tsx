'use client';

import Link from 'next/link';
import { Card } from 'antd';
import { useParams } from 'next/navigation';

import styles from './sections.module.scss';
import { ReactElement, ReactNode } from 'react';
import React from 'react';

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

type TileProps = {
  title: string;
  href: string;
  icon: ReactElement<{ className: string }>;
};

const Tile: React.FC<TileProps> = ({ title, href, icon }) => {
  const params = useParams();
  const environmentId = params.environmentId as string;

  return (
    <Link key={title} href={`/${environmentId}/${href}`} className={styles.Tile}>
      <Card hoverable className={styles.TileCard}>
        {icon}
        <h3 className={styles.TileCardTitle}>{title}</h3>
      </Card>
    </Link>
  );
};

export const TaskListTile: React.FC = () => {
  return (
    <Tile
      title="Task List"
      href="/tasklist"
      icon={<CheckSquareOutlined className={styles.TileIcon} />}
    />
  );
};
export const TaskEditorTile: React.FC = () => {
  return (
    <Tile title="Task Editor" href="/tasks" icon={<FormOutlined className={styles.TileIcon} />} />
  );
};

export const ProcessEditorTile: React.FC = () => {
  return (
    <Tile
      title="Process Editor"
      href="/processes/editor"
      icon={<EditOutlined className={styles.TileIcon} />}
    />
  );
};
export const ProcessListTile: React.FC = () => {
  return (
    <Tile
      title="Process List"
      href="/processes/list"
      icon={<CopyOutlined className={styles.TileIcon} />}
    />
  );
};

export const ExecutionDashboardTile: React.FC = () => {
  return (
    <Tile
      title="Dashboard"
      href="/executions-dashboard"
      icon={<BarChartOutlined className={styles.TileIcon} />}
    />
  );
};
export const ProcessExecutionsTile: React.FC = () => {
  return (
    <Tile
      title="Executions"
      href="/executions"
      icon={<NodeExpandOutlined className={styles.TileIcon} />}
    />
  );
};
export const ProcessEngineTile: React.FC = () => {
  return (
    <Tile
      title="Process Engines"
      href="/engines"
      icon={<LaptopOutlined className={styles.TileIcon} />}
    />
  );
};

export const UserProfileTile: React.FC = () => {
  return (
    <Tile title="My Profile" href="/profile" icon={<UserOutlined className={styles.TileIcon} />} />
  );
};
export const UserSpacesTile: React.FC = () => {
  return (
    <Tile
      title="My Spaces"
      href="/spaces"
      icon={<AppstoreOutlined className={styles.TileIcon} />}
    />
  );
};

export const SettingsTile: React.FC = () => {
  return (
    <Tile
      title="Settings"
      href="/settings"
      icon={<SettingOutlined className={styles.TileIcon} />}
    />
  );
};

type SectionProps = {
  icon: ReactElement<{ className: string }>;
  title: string;
  description: ReactNode;
  tiles: ReactNode[];
} & React.PropsWithChildren;

export const Section: React.FC<SectionProps> = ({ icon, title, description, tiles }) => {
  if (!tiles.filter(truthyFilter).length) return null;

  return (
    <div key={title} className={styles.Section}>
      <h2>
        {icon}
        {title}
      </h2>
      {description}
      <div className={styles.TileGroup}>{...tiles}</div>
    </div>
  );
};

export const TaskSection: React.FC<{ tiles: ReactNode[] }> = ({ tiles }) => {
  return (
    <Section
      title="My Tasks"
      description={
        <p>
          Manage your running or planned tasks in the Task List.<br></br>
          Edit your existing tasks using the Task Editor.
        </p>
      }
      icon={<CheckSquareOutlined className={styles.SectionIcon} />}
      tiles={tiles}
    />
  );
};

export const ProcessSection: React.FC<{ tiles: ReactNode[] }> = ({ tiles }) => {
  return (
    <Section
      title="My Processes"
      description={
        <p>
          Create, edit and organize your BPMN processes with the Process Editor. <br></br>
          Browse already versioned, released processes in the Process List
        </p>
      }
      icon={<PartitionOutlined className={styles.SectionIcon} />}
      tiles={tiles}
    />
  );
};

export const AutomationSection: React.FC<{ tiles: ReactNode[] }> = ({ tiles }) => {
  return (
    <Section
      title="Automations"
      description={
        <p>
          Observe your running automations on the Dashboard, deploy your automation processes
          <br></br>in the Executions tab, and manage your connected engines in Process Engines.
        </p>
      }
      icon={<PlaySquareOutlined className={styles.SectionIcon} />}
      tiles={tiles}
    />
  );
};

export const UserSection: React.FC<{ tiles: ReactNode[] }> = ({ tiles }) => {
  return (
    <Section
      title="Personal"
      description={
        <p>
          Change your user profile information or<br></br>
          manage the different personal spaces you created.
        </p>
      }
      icon={<UserOutlined className={styles.SectionIcon} />}
      tiles={tiles}
    />
  );
};

export const UserSpaceSection: React.FC<{ tiles: ReactNode[] }> = ({ tiles }) => {
  return (
    <Section
      title="Home"
      description={
        <p>
          Adjust the visual settings of your space <br></br>
          and create custom navigation links for easier access.
        </p>
      }
      icon={<HomeOutlined className={styles.SectionIcon} />}
      tiles={tiles}
    />
  );
};

export default Section;

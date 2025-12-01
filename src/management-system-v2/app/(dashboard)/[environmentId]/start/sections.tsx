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
  EditFilled,
  FormOutlined,
} from '@ant-design/icons';
import { AppstoreOutlined } from '@ant-design/icons';
import { TbUser, TbUserEdit } from 'react-icons/tb';
import { HomeOutlined, SettingOutlined } from '@ant-design/icons';

const MyTasksSection = () => {
  const params = useParams();
  const environmentId = params.environmentId as string;

  const tiles = [
    {
      title: 'Task List',
      href: `/${environmentId}/tasklist`,
      icon: <CheckSquareOutlined style={{ fontSize: '32px', marginBottom: '8px' }} />,
    },
    {
      title: 'Task Editor',
      href: `/${environmentId}/tasklist`,
      icon: <FormOutlined style={{ fontSize: '32px', marginBottom: '8px' }} />,
    },
  ];

  return (
    <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
      <h2>
        <CheckSquareOutlined style={{ marginRight: '8px' }} />
        My Tasks
      </h2>
      <p>
        Manage your running or planned tasks in the Task List.<br></br>
        Edit your existing tasks using the Task Editor.
      </p>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        {tiles.map((tile) => (
          <Link
            key={tile.title}
            href={tile.href}
            style={{ textDecoration: 'none', width: '250px' }}
          >
            <Card hoverable style={{ textAlign: 'center' }}>
              {tile.icon}
              <h3 style={{ marginTop: '8px' }}>{tile.title}</h3>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

const ProcessesSection = () => {
  const params = useParams();
  const environmentId = params.environmentId as string;

  const tiles = [
    {
      title: 'Process Editor',
      href: `/${environmentId}/processes`,
      icon: <EditOutlined style={{ fontSize: '32px', marginBottom: '8px' }} />,
    },
    {
      title: 'Process List',
      href: `/${environmentId}/processes`,
      icon: <CopyOutlined style={{ fontSize: '32px', marginBottom: '8px' }} />,
    },
  ];

  return (
    <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
      <h2>
        <PartitionOutlined style={{ marginRight: '8px' }} />
        My Processes
      </h2>
      <p>
        Create, edit and organize your BPMN processes with the Process Editor. <br></br>
        Browse already versioned, released processes in the Process List
      </p>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        {tiles.map((tile) => (
          <Link
            key={tile.title}
            href={tile.href}
            style={{ textDecoration: 'none', width: '250px' }}
          >
            <Card hoverable style={{ textAlign: 'center' }}>
              {tile.icon}
              <h3 style={{ marginTop: '8px' }}>{tile.title}</h3>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

const AutomationsSection = () => {
  const params = useParams();
  const environmentId = params.environmentId as string;

  const tiles = [
    {
      title: 'Dashboard',
      href: `/${environmentId}/executions-dashboard`,
      icon: <BarChartOutlined style={{ fontSize: '32px', marginBottom: '8px' }} />,
    },
    {
      title: 'Executions',
      href: `/${environmentId}/executions`,
      icon: <NodeExpandOutlined style={{ fontSize: '32px', marginBottom: '8px' }} />,
    },
    {
      title: 'Process Engines',
      href: `/${environmentId}/engines`,
      icon: <LaptopOutlined style={{ fontSize: '32px', marginBottom: '8px' }} />,
    },
  ];

  return (
    <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
      <h2>
        <PlaySquareOutlined style={{ marginRight: '8px' }} />
        Automations
      </h2>
      <p>
        Observe your running automations on the Dashboard, deploy your automation processes
        <br></br>in the Executions tab, and manage your connected engines in Process Engines.
      </p>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        {tiles.map((tile) => (
          <Link
            key={tile.title}
            href={tile.href}
            style={{ textDecoration: 'none', width: '250px' }}
          >
            <Card hoverable style={{ textAlign: 'center' }}>
              {tile.icon}
              <h3 style={{ marginTop: '8px' }}>{tile.title}</h3>
            </Card>
          </Link>
        ))}
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
      icon: <TbUserEdit style={{ fontSize: '32px', marginBottom: '8px' }} />,
    },
    {
      title: 'My Spaces',
      href: `/${environmentId}/spaces`,
      icon: <AppstoreOutlined style={{ fontSize: '32px', marginBottom: '8px' }} />,
    },
  ];

  return (
    <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
      <h2>
        <TbUser style={{ marginRight: '8px' }} />
        Personal
      </h2>
      <p>
        Change your user profile information or<br></br>
        manage the different personal spaces you created.
      </p>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        {tiles.map((tile) => (
          <Link
            key={tile.title}
            href={tile.href}
            style={{ textDecoration: 'none', width: '250px' }}
          >
            <Card hoverable style={{ textAlign: 'center' }}>
              {tile.icon}
              <h3 style={{ marginTop: '8px' }}>{tile.title}</h3>
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
      icon: <SettingOutlined style={{ fontSize: '32px', marginBottom: '8px' }} />,
    },
  ];

  return (
    <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
      <h2>
        <HomeOutlined style={{ marginRight: '8px' }} />
        Home
      </h2>
      <p>
        Adjust the visual settings of your space <br></br>
        and create custom navigation links for easier access.
      </p>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        {tiles.map((tile) => (
          <Link
            key={tile.title}
            href={tile.href}
            style={{ textDecoration: 'none', width: '250px' }}
          >
            <Card hoverable style={{ textAlign: 'center' }}>
              {tile.icon}
              <h3 style={{ marginTop: '8px' }}>{tile.title}</h3>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export { MyTasksSection, ProcessesSection, AutomationsSection, PersonalSection, HomeSection };

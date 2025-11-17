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
    <div style={{ marginBottom: '1.5rem' }}>
      <h2>
        <CheckSquareOutlined style={{ marginRight: '8px' }} />
        My Tasks
      </h2>
      <p>
        Short description goes here explaining what this section is for and what you can do here and
        so on and so forth.
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: '16px',
        }}
      >
        {tiles.map((tile) => (
          <Link key={tile.title} href={tile.href} style={{ textDecoration: 'none' }}>
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
    <div style={{ marginBottom: '1.5rem' }}>
      <h2>
        <PartitionOutlined style={{ marginRight: '8px' }} />
        My Processes
      </h2>
      <p>
        Short description goes here explaining what this section is for and what you can do here and
        so on and so forth. <br></br>There could be further links for the most regularly used
        sub-views within here.
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: '16px',
        }}
      >
        {tiles.map((tile) => (
          <Link key={tile.title} href={tile.href} style={{ textDecoration: 'none' }}>
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
    <div style={{ marginBottom: '1.5rem' }}>
      <h2>
        <PlaySquareOutlined style={{ marginRight: '8px' }} />
        Automations
      </h2>
      <p>
        Short description goes here explaining what this section is for and what you can do here and
        so on and so forth. <br></br>There could be further links for the most regularly used
        sub-views within here.
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: '16px',
        }}
      >
        {tiles.map((tile) => (
          <Link key={tile.title} href={tile.href} style={{ textDecoration: 'none' }}>
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
    <div style={{ marginBottom: '1.5rem' }}>
      <h2>
        <TbUser style={{ marginRight: '8px' }} />
        Personal
      </h2>
      <p>
        Short description goes here explaining what this section is for and what you can do here and
        so on and so forth. <br></br>There could be further links for the most regularly used
        sub-views within here.
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: '16px',
        }}
      >
        {tiles.map((tile) => (
          <Link key={tile.title} href={tile.href} style={{ textDecoration: 'none' }}>
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
    <div style={{ marginBottom: '1.5rem' }}>
      <h2>
        <HomeOutlined style={{ marginRight: '8px' }} />
        Home
      </h2>
      <p>
        Short description goes here explaining what this section is for and what you can do here and
        so on and so forth. <br></br>There could be further links for the most regularly used
        sub-views within here.
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: '16px',
        }}
      >
        {tiles.map((tile) => (
          <Link key={tile.title} href={tile.href} style={{ textDecoration: 'none' }}>
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

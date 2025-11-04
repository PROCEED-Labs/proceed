'use client';

import Link from 'next/link';
import { Card } from 'antd';
import { useParams } from 'next/navigation';
import { CheckSquareOutlined, EditOutlined } from '@ant-design/icons';

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
      icon: <EditOutlined style={{ fontSize: '32px', marginBottom: '8px' }} />,
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

export default MyTasksSection;

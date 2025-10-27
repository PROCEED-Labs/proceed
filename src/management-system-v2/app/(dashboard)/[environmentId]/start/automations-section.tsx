'use client';

import Link from 'next/link';
import { Card } from 'antd';
import { useParams } from 'next/navigation';
import {
  PlaySquareOutlined,
  BarChartOutlined,
  NodeExpandOutlined,
  LaptopOutlined,
} from '@ant-design/icons';

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
    <div>
      <h2>
        <PlaySquareOutlined style={{ marginRight: '8px' }} />
        Automations
      </h2>
      <h4>
        Short description goes here explaining what this section is for and what you can do here and
        so on and so forth. <br></br>There could be further links for the most regularly used
        sub-views within here.
      </h4>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
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

export default AutomationsSection;

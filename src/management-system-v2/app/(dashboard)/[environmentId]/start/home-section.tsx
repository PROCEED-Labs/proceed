'use client';

import Link from 'next/link';
import { Card } from 'antd';
import { useParams } from 'next/navigation';
import { HomeOutlined, SettingOutlined } from '@ant-design/icons';

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
    <div>
      <h2>
        <HomeOutlined style={{ marginRight: '8px' }} />
        Home
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

export default HomeSection;

import { getCurrentUser } from '@/components/auth';
import Content from '@/components/content';
import { environmentsMetaObject } from '@/lib/data/legacy/iam/environments';
import { getSystemAdminByUserId } from '@/lib/data/DTOs';
import { usersMetaObject } from '@/lib/data/legacy/iam/users';
import { Card, Space, Statistic } from 'antd';
import { redirect } from 'next/navigation';
import { CSSProperties } from 'react';

export default async function AdminDashboard() {
  const user = await getCurrentUser();
  if (!user.session) redirect('/');

  const adminData = await getSystemAdminByUserId(user.userId);
  if (!adminData) redirect('/');

  // NOTE: this should be replaced to a more efficient count query
  // when the data persistence layer is implemented
  const usersAmount = Object.keys(usersMetaObject).length;
  const spacesAmount = Object.keys(environmentsMetaObject).length;

  const cardStyle: CSSProperties = {
    width: '80%',
    maxWidth: '20rem',
  };

  return (
    <Content title="MS admin dashboard">
      <Space direction="vertical" style={{ width: '100%' }}>
        <Card bordered={false} style={cardStyle}>
          <Statistic title="Users" value={usersAmount} />
        </Card>
        <Card bordered={false} style={cardStyle}>
          <Statistic title="Spaces" value={spacesAmount} />
        </Card>
      </Space>
    </Content>
  );
}

export const dynamic = 'force-dynamic';

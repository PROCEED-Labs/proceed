import { getCurrentUser } from '@/components/auth';
import Content from '@/components/content';
import { getSystemAdminByUserId } from '@/lib/data/db/iam/system-admins';
import { Card, Space, Statistic } from 'antd';
import { redirect } from 'next/navigation';
import { CSSProperties } from 'react';
import db from '@/lib/data/db';
import { errorResponse } from '@/lib/server-error-handling/page-error-response';

export default async function AdminDashboard() {
  const user = await getCurrentUser();
  if (user.isErr()) return errorResponse(user);
  if (!user.value.session) redirect('/');

  const adminData = await getSystemAdminByUserId(user.value.userId);
  if (adminData.isErr()) return errorResponse(adminData);
  if (!adminData.value) redirect('/');

  // NOTE: this should be replaced to a more efficient count query
  // when the data persistence layer is implemented

  const [usersAmount, spacesAmount] = await Promise.all([db.user.count(), db.space.count()]);

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

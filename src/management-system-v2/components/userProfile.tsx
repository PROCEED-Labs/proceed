'use client';
import { FC } from 'react';
import Content from './content';
import { Space, Card, Table, Avatar, TableColumnsType, Divider } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { User, fetchUserData } from '@/lib/fetch-data';
import styles from './userProfile.module.scss';

const UserProfile: FC = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['userProfile'],
    queryFn: () => fetchUserData(),
  });

  if (isError) {
    return <div>Error</div>;
  }

  return (
    <Content title="User Profile">
      <Space direction="vertical" size="large" style={{ display: 'flex' }}>
        <Card /* style={{ width: 300 }} */>
          <Avatar size={64} src={data ? data.picture : ''} />
          <Divider />
          <Space>Name: </Space>
          <Divider />
          <Space>Username: </Space>
          <Divider />
          <Space>Email:</Space>
          <Divider />
          <Space>Change Password</Space>
        </Card>
      </Space>
    </Content>
  );
};

export default UserProfile;

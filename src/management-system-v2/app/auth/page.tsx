'use client';
import Login from '@/components/login';
import { useRouter, usePathname } from 'next/navigation';
import { FC, useEffect } from 'react';
import style from './auth.module.scss';
import { Space, theme } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { Spin } from 'antd';

const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;

const authPage: FC = () => {
  const router = useRouter();
  const activeSegment = usePathname().split('/')[1] || 'auth';

  router.push('/auth/login');

  // const {
  //   token: { colorBgContainer },
  // } = theme.useToken();

  return (
    // <Login></Login>
    <Space
      direction="horizontal"
      style={{ width: '100%', height: '100%', justifyContent: 'center' }}
    >
      <Spin indicator={antIcon} /> Loading ...
    </Space>
  );
};

export default authPage;

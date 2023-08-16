'use client';
import Login from '@/components/login';
import { useRouter, usePathname } from 'next/navigation';
import { FC } from 'react';
import style from './auth.module.scss';
import { theme } from 'antd';
import AuthLayout from '../layout';

const LoginPage: FC = () => {
  // const router = useRouter();
  // const activeSegment = usePathname().split('/')[1] || 'auth';

  // const {
  //   token: { colorBgContainer },
  // } = theme.useToken();

  return (
    <Login></Login>
    // <div>Test login</div>
  );
};

export default LoginPage;

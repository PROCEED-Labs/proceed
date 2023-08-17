'use client';

import styles from './layout.module.scss';
import { FC, PropsWithChildren, useEffect, useState } from 'react';
import { Layout as AntLayout, Button, Menu, MenuProps, Popover, Space, Tooltip } from 'antd';
import {
  DeploymentUnitOutlined,
  FundProjectionScreenOutlined,
  EditOutlined,
  UnorderedListOutlined,
  ProfileOutlined,
  FileAddOutlined,
  PlaySquareOutlined,
  SettingOutlined,
  ApiOutlined,
  UserOutlined,
} from '@ant-design/icons';
import Logo from '@/public/proceed.svg';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import cn from 'classnames';
import Content from './content';
import HeaderActions from './header-actions';
import Login from './login';

const Layout: FC<PropsWithChildren> = ({ children }) => {
  return <>{children}</>;
};

export default Layout;

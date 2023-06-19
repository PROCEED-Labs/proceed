'use client';

import styles from './layout.module.scss';
import { FC, PropsWithChildren, useState } from 'react';
import { Layout as AntLayout, Menu, MenuProps } from 'antd';
import { EditOutlined, UnorderedListOutlined, ProfileOutlined } from '@ant-design/icons';
import Logo from '@/public/proceed.svg';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import cn from 'classnames';

const items: MenuProps['items'] = [
  {
    key: 'processes',
    icon: <EditOutlined />,
    label: 'Processes',
  },
  {
    key: 'projects',
    icon: <UnorderedListOutlined />,
    label: 'Projects',
  },
  {
    key: 'templates',
    icon: <ProfileOutlined />,
    label: 'Templates',
    disabled: true,
  },
];

const Layout: FC<PropsWithChildren> = ({ children }) => {
  const router = useRouter();
  const activeSegment = usePathname().split('/')[1] || 'processes';
  const [collapsed, setCollapsed] = useState(false);

  // Note: The page layout is located in the content component because it
  // sometimes needs to be entirely customized by the page (e.g. position
  // absolute above another page).
  return (
    <AntLayout>
      <AntLayout.Sider
        className={styles.Sider}
        collapsible
        collapsed={collapsed}
        onCollapse={(collapsed) => setCollapsed(collapsed)}
      >
        <Image
          src="/proceed.svg"
          alt="PROCEED Logo"
          className={cn(styles.Logo, { [styles.collapsed]: collapsed })}
          width={160}
          height={63}
          priority
        />
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[activeSegment]}
          items={items}
          onClick={({ key }) => {
            router.push(`/${key}`);
          }}
        />
      </AntLayout.Sider>
      <div className={cn(styles.Main, { [styles.collapsed]: collapsed })}>{children}</div>
    </AntLayout>
  );
};

export default Layout;

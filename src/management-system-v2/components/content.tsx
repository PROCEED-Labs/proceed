'use client';

import styles from './content.module.scss';
import { FC, PropsWithChildren, ReactNode } from 'react';
import { Layout as AntLayout, Grid, Button, Image } from 'antd';
import { MenuOutlined } from '@ant-design/icons';
import cn from 'classnames';
import HeaderActions from './header-actions';
import Link from 'next/link';

type ContentProps = PropsWithChildren<{
  /** Top left title in the header (or custom node). */
  title?: ReactNode;
  /** If true, the content won't have any padding. */
  compact?: boolean;
  /** If true, the content won't have a header. */
  noHeader?: boolean;
  /** Class name for the wrapper. */
  wrapperClass?: string;
  /** Class name for the header. */
  headerClass?: string;

  siderOpened?: boolean;
}>;

//TODO: open and close hamburger menu

const Content: FC<ContentProps> = ({
  children,
  title,
  compact = false,
  noHeader = false,
  wrapperClass,
  headerClass,
  siderOpened
}) => {
  const breakpoint = Grid.useBreakpoint();

  return (
    <AntLayout className={cn(styles.Main, wrapperClass)}>
      {noHeader ? null : (
        <AntLayout.Header className={cn(styles.Header, headerClass)}>

          {/* Add icon into header for xs screens*/}
          {breakpoint.xs ? <div className={styles.LogoContainer}>
            <Link href="/processes">
              <Image
                src={'/proceed-icon.png'}
                alt="PROCEED Logo"
                className={styles.Icon}
                width={breakpoint.xs ? 85 : 160}
                height={breakpoint.xs ? 35 : 63}
              />
            </Link>
          </div> : null }

          <div className={styles.Title}>{title}</div>
          {breakpoint.xs ? (
            // Hamburger menu for mobile view
            <div>
            <Button
              className={styles.Hamburger}
              type="text"
              size="large"
              style={{ marginTop: '20px', marginLeft: '15px' }}
              icon={<MenuOutlined style={{ fontSize: '170%' }} />}
              onClick={() => !siderOpened}
            /></div>
          ) : (
            // Logout and User Profile in header for screens larger than 412px
            <HeaderActions />
          )}
        </AntLayout.Header>
      )}
      <AntLayout.Content className={cn(styles.Content, { [styles.compact]: compact })}>
        {children}
      </AntLayout.Content>
    </AntLayout>
  );
};

export default Content;

'use client';

import styles from './content.module.scss';
import { FC, PropsWithChildren, ReactNode } from 'react';
import { Layout as AntLayout, Grid, Button } from 'antd';
import { MenuOutlined } from '@ant-design/icons';
import cn from 'classnames';
import HeaderActions from './header-actions';

type ContentProps = PropsWithChildren<{
  /** Top left title in the header (or custom node). */
  title?: ReactNode;
  /** Center element in the header (overrides title) */
  headerLeft?: ReactNode;
  /** Center element in the header */
  headerCenter?: ReactNode;
  /** If true, the content won't have any padding. */
  compact?: boolean;
  /** If true, the content won't have a header. */
  noHeader?: boolean;
  /** Class name for the wrapper. */
  wrapperClass?: string;
  /** Class name for the header. */
  headerClass?: string;
}>;

const Content: FC<ContentProps> = ({
  children,
  title,
  headerLeft,
  headerCenter,
  compact = false,
  noHeader = false,
  wrapperClass,
  headerClass,
}) => {
  const breakpoint = Grid.useBreakpoint();

  return (
    <AntLayout className={cn(styles.Main, wrapperClass)}>
      {noHeader ? null : (
        <AntLayout.Header className={cn(styles.Header, headerClass)}>
          {headerLeft || <div className={styles.Title}>{title}</div>}
          {headerCenter || null}
          {breakpoint.xs ? (
            // Hamburger menu for mobile view
            <Button
              type="text"
              style={{ marginTop: '20px', marginLeft: '15px' }}
              icon={<MenuOutlined style={{ fontSize: '170%' }} />}
            />
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

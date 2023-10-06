'use client';

import styles from './content.module.scss';
import { FC, PropsWithChildren, ReactNode } from 'react';
import { Layout as AntLayout, theme, Typography, Grid, Button } from 'antd';
import { MenuOutlined } from '@ant-design/icons';
import cn from 'classnames';
import Link from 'next/link';
import Image from 'next/image';
import HeaderActions from './header-actions';

const { Title } = Typography;

type ContentProps = PropsWithChildren<{
  /** Top left title in the header (or custom node). */
  title?: ReactNode;
  /** Top right node in the header. */
  rightNode?: ReactNode;
  /** If true, the content won't have any padding. */
  compact?: boolean;
  /** If true, the content won't have a header. */
  noHeader?: boolean;
  /** Class name for the wrapper. */
  wrapperClass?: string;
  /** Class name for the header. */
  headerClass?: string;
  /** Class name for the footer. */
  footerClass?: string;
  /* Whether the header is fixed or not */
  fixedHeader?: boolean;
}>;

const Content: FC<ContentProps> = ({
  children,
  title,
  rightNode,
  compact = false,
  noHeader = false,
  wrapperClass,
  headerClass,
  fixedHeader = false,
}) => {
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  const breakpoint = Grid.useBreakpoint();

  return (
    <AntLayout className={cn(styles.Main, wrapperClass)}>
      {noHeader ? null : (
        <AntLayout.Header className={styles.Header}>
          <div className={styles.Title}>{title}</div>
          {breakpoint.xs ? (
            // Hamburger menu for mobile view
            <>
              <Button
                type="text"
                size="large"
                style={{ marginTop: '20px', marginLeft: '15px' }}
                icon={<MenuOutlined style={{ fontSize: '170%' }} />}
              />
            </>
          ) : (
            // Logout and User Profile in header for screens larger than 412px
            <>
              <HeaderActions />
            </>
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

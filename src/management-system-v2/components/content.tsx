'use client';

import styles from './content.module.scss';
import { FC, PropsWithChildren } from 'react';
import { Layout, theme, Typography } from 'antd';
import cn from 'classnames';

const { Title } = Typography;

type ContentProps = PropsWithChildren<{
  /** Top left title in the header. */
  title?: string;
  /** Top right node in the header. */
  rightNode?: React.ReactNode;
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
  footerClass,
  fixedHeader = false,
}) => {
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  return (
    <Layout className={cn(styles.Main, wrapperClass)}>
      <div
        style={{
          background: colorBgContainer,
          // paddingTop: '7px',
          //borderBottom: '1px solid #eee',
          // position: fixedHeader ? 'fixed' : 'static',
          // width: fixedHeader ? '100%' : 'auto',
        }}
        className={cn(styles.Header, headerClass)}
      >
        <Title level={3} className={styles.Title}>
          {title}
        </Title>
        <div className={styles.Right}>{rightNode}</div>
      </div>
      <Layout.Content
        className={cn(styles.Content, { [styles.compact]: compact })}
        style={{
          background: colorBgContainer,
        }}
      >
        {children}
      </Layout.Content>
    </Layout>
  );
};

export default Content;

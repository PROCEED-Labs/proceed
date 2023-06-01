'use client';

import styles from './content.module.css';
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
}) => {
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  return (
    <Layout className={cn(styles.Main, wrapperClass)}>
      {noHeader ? null : (
        <Layout.Header
          style={{
            background: colorBgContainer,
            borderBottom: '1px solid #eee',
          }}
          className={cn(styles.Header, headerClass)}
        >
          <Title level={3} className={styles.Title}>
            {title}
          </Title>
          <div className={styles.Right}>{rightNode}</div>
        </Layout.Header>
      )}
      <Layout.Content className={cn(styles.Content, { [styles.compact]: compact })}>
        {children}
      </Layout.Content>
      <Layout.Footer className={cn(styles.Footer, footerClass)}>
        © 2023 PROCEED Labs GmbH
      </Layout.Footer>
    </Layout>
  );
};

export default Content;

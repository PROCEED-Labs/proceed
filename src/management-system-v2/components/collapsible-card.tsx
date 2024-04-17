'use client';

import { Card, Button } from 'antd';
import { DoubleRightOutlined, DoubleLeftOutlined } from '@ant-design/icons';
import React, { FC, PropsWithChildren } from 'react';
import classNames from 'classnames';

type CollapsibleCardProps = PropsWithChildren<{
  show: boolean;
  collapsedWidth?: string;
  onCollapse: () => void;
  title: string;
}>;

const CollapsibleCard: FC<CollapsibleCardProps> = ({
  title,
  show,
  collapsedWidth = '30px',
  onCollapse,
  children,
}) => {
  return (
    <Card
      className={classNames({ 'Hide-Scroll-Bar': !show })}
      style={{
        scrollBehavior: 'smooth',
        overflowY: 'auto',
        height: '100%',
        scrollbarWidth: 'none',
        width: show ? '100%' : collapsedWidth,
      }}
      styles={{ header: { padding: 0 } }}
      title={
        show ? (
          <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.875rem' }}>
            <Button
              type="text"
              style={{
                marginInline: '6px',
                padding: '0',
              }}
              onClick={() => {
                onCollapse();
              }}
            >
              <DoubleRightOutlined />
            </Button>
            <span>{title}</span>
          </div>
        ) : (
          <Button
            type="text"
            style={{
              width: '100%',
              fontSize: '0.875rem',
              padding: '0',
            }}
            onClick={() => {
              onCollapse();
            }}
          >
            <DoubleLeftOutlined />
          </Button>
        )
      }
    >
      {show && children}
    </Card>
  );
};

export default CollapsibleCard;

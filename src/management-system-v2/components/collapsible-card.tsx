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
      headStyle={{ padding: 0 }}
      title={
        show ? (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Button
              type="text"
              style={{
                padding: '2px',
                marginInline: '6px',
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
              padding: '2px',
              width: '100%',
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

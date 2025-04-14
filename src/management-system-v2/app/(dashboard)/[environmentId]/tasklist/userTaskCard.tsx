'use client';

import cn from 'classnames';
import { Card, Col, Progress, Row } from 'antd';
import {
  UserOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  StarOutlined,
  FieldTimeOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { generateDateString } from '@/lib/utils';
import { transformMilisecondsToDurationValues } from '@/lib/helpers/timeHelper';
import styles from './userTaskCard.module.scss';
import React, { ReactNode } from 'react';

type CardLineEntry = { icon: ReactNode; text: ReactNode };
const CardInfoLine: React.FC<{ entries: CardLineEntry[] }> = ({ entries }) => {
  return (
    <>
      <Row gutter={16}>
        {entries.map(({ icon, text }, index) => (
          <Col span={10} key={index}>
            <span style={{ fontSize: '0.75rem' }}>
              {icon} {text}
            </span>
          </Col>
        ))}
      </Row>
    </>
  );
};

const UserTaskCard = ({
  userTaskData,
  clickHandler,
  selected = false,
}: {
  userTaskData: {
    id: string;
    name: string;
    state: string;
    owner?: string;
    startTime: number;
    endTime: number;
    priority: number;
    progress: number;
  };
  clickHandler?: () => void;
  selected?: boolean;
}) => {
  const durationValues = transformMilisecondsToDurationValues(
    +new Date() - userTaskData.startTime,
    true,
  );

  const durationString =
    ' ' +
    (durationValues.days ? `${durationValues.days}d, ` : '') +
    (durationValues.hours ? `${durationValues.hours}h, ` : '') +
    (durationValues.minutes ? `${durationValues.minutes}min` : '');

  const lines = [
    [
      { icon: <UserOutlined />, text: userTaskData.owner },
      {
        icon: <CalendarOutlined />,
        text: generateDateString(new Date(userTaskData.startTime), true),
      },
    ],
    [
      { icon: <StarOutlined />, text: `${userTaskData.priority}/10` },
      {
        icon: <FieldTimeOutlined />,
        text: durationString,
      },
    ],
    [
      { icon: <QuestionCircleOutlined />, text: userTaskData.state },
      {
        icon: <ClockCircleOutlined />,
        text: generateDateString(new Date(userTaskData.endTime), true),
      },
    ],
  ] as CardLineEntry[][];

  return (
    <Card
      title={
        <div className={styles.UserTaskCardTitle}>
          <span>{userTaskData.name}</span>
          <Progress type="circle" percent={userTaskData.progress} size={30} />
        </div>
      }
      bordered={false}
      className={cn(styles.UserTaskCard, { [styles.selected]: selected })}
      classNames={{
        body: styles.UserTaskCardBody,
        header: styles.UserTaskCardHeader,
      }}
      onClick={() => {
        clickHandler?.();
      }}
    >
      {lines.map((line, index) => (
        <CardInfoLine entries={line} key={index} />
      ))}
    </Card>
  );
};

export default UserTaskCard;

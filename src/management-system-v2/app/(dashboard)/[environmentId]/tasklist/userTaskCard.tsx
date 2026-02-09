'use client';
import React, { ReactNode } from 'react';
import { Card, Col, Progress, Row, Tooltip, Typography } from 'antd';
import cn from 'classnames';

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
import { ExtendedTaskListEntry } from '@/lib/user-task-schema';

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

const OwnerInfo: React.FC<{ task: ExtendedTaskListEntry }> = ({ task }) => {
  let owner = '';

  if (task.actualOwner.length === 1) {
    owner = task.actualOwner[0].name || task.actualOwner[0].userName || '<unknown>';
  } else if (task.actualOwner.length > 1) {
    owner = task.actualOwner.map(({ name, userName }) => name || userName).join(' | ');
  }

  return (
    <Tooltip title={owner}>
      <UserOutlined />{' '}
      <Typography.Text ellipsis style={{ fontSize: 'inherit' }}>
        {owner}
      </Typography.Text>
    </Tooltip>
  );
};

const UserTaskCard = ({
  userTaskData,
  clickHandler,
  selected = false,
}: {
  userTaskData: ExtendedTaskListEntry;
  clickHandler?: () => void;
  selected?: boolean;
}) => {
  const endTime = userTaskData.endTime;

  const durationValues = transformMilisecondsToDurationValues(
    (endTime || +new Date()) - userTaskData.startTime,
    true,
  );

  const durationString =
    ' ' +
    (durationValues.days ? `${durationValues.days}d, ` : '') +
    (durationValues.hours ? `${durationValues.hours}h, ` : '') +
    `${durationValues.minutes || 0}min`;

  const lines = [
    [
      { icon: <OwnerInfo task={userTaskData} /> },
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
        text: generateDateString(new Date(userTaskData.endTime || 0), true),
      },
    ],
  ] as CardLineEntry[][];

  return (
    <Card
      title={
        <>
          <div className={styles.UserTaskCardTitle}>
            <span>{userTaskData.name}</span>
            <Progress type="circle" percent={userTaskData.progress} size={30} />
          </div>
          {userTaskData.offline && !userTaskData.endTime && (
            <Tooltip title="The engine this user task is running on is currently not reachable!">
              <Typography.Text style={{ fontSize: '0.9em' }} italic type="warning">
                Offline
              </Typography.Text>
            </Tooltip>
          )}
        </>
      }
      variant="borderless"
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

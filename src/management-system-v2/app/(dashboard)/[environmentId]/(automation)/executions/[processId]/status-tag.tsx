import React, { ReactNode } from 'react';
import { statusToType } from './instance-helpers';
import type { ElementLike } from 'diagram-js/lib/core/Types';
import { ExtendedInstanceInfo } from '@/lib/data/instance';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { Tag } from 'antd';

export const StatusTag = ({
  processId,
  element,
  instance,
}: {
  processId: string;
  element?: ElementLike;
  instance?: ExtendedInstanceInfo;
}) => {
  // Element status
  const isRootElement = element && element.type === 'bpmn:Process';
  let status = undefined;
  if (isRootElement && instance) {
    status = instance.instanceState.reduce((overallState, state) => {
      return ['ENDED', 'STOPPED'].includes(overallState) ? state : overallState;
    });
  } else if (element && instance) {
    const elementInfo = instance.log.find((l) => l.flowElementId == element.id);
    if (elementInfo) {
      status = elementInfo.executionState;
    } else {
      const tokenInfo = instance.tokens.find((l) => l.currentFlowElementId == element.id);
      status = tokenInfo ? tokenInfo.currentFlowNodeState : 'WAITING';
    }
  }
  const statusType = status && statusToType(status);
  const presets: Record<string, ReactNode> = {
    READY: <CheckCircleOutlined />,
    COMPLETED: <CheckCircleOutlined />,
    RUNNING: <SyncOutlined spin />,
    info: <ExclamationCircleOutlined />,
    warning: <ExclamationCircleOutlined />,
    STOPPED: <CloseCircleOutlined />,
    WAITING: <ClockCircleOutlined />,
  };
  return (
    status &&
    statusType && (
      <Tag
        key={status}
        color={statusType}
        icon={status ? presets[status] : <ClockCircleOutlined />}
      >
        {status}
      </Tag>
    )
  );
};

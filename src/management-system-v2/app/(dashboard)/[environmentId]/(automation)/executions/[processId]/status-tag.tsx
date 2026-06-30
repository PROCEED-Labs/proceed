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
  element,
  instance,
}: {
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
    success: <CheckCircleOutlined />,
    warning: <ExclamationCircleOutlined />,
    error: <CloseCircleOutlined />,
    info: <ClockCircleOutlined />,
  };
  return (
    status &&
    statusType && (
      <Tag
        key={status}
        color={statusType}
        icon={
          status ? (
            status === 'RUNNING' ? (
              <SyncOutlined spin />
            ) : (
              presets[statusToType(status)]
            )
          ) : (
            <ClockCircleOutlined />
          )
        }
      >
        {status}
      </Tag>
    )
  );
};

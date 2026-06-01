import React, { ReactNode } from 'react';
import { RelevantInstanceInfo } from './instance-info-panel';
import { statusToType } from './instance-helpers';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { Tag } from 'antd';

export const StatusTag = ({ info }: { info: RelevantInstanceInfo }) => {
  // Element status
  const isRootElement = info.element && info.element.type === 'bpmn:Process';
  let status = undefined;
  if (isRootElement && info.instance) {
    status = info.instance.instanceState[0];
  } else if (info.element && info.instance) {
    const elementInfo = info.instance.log.find((l) => l.flowElementId == info.element.id);
    if (elementInfo) {
      status = elementInfo.executionState;
    } else {
      const tokenInfo = info.instance.tokens.find((l) => l.currentFlowElementId == info.element.id);
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

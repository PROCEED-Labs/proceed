'use client';

import { ParentConfig } from '@/lib/data/machine-config-schema';

import { Collapse, theme } from 'antd';
import { CaretRightOutlined } from '@ant-design/icons';
import Content from './config-content';

type MachineDataViewProps = {
  parentConfig: ParentConfig;
  editingEnabled: boolean;
};

const TargetConfiguration: React.FC<MachineDataViewProps> = ({ parentConfig, editingEnabled }) => {
  const { token } = theme.useToken();
  const panelStyle = {
    marginBottom: 20,
    // background: token.colorFillAlter,
    background: 'rgba(255,255,255,0.9)',
    borderRadius: token.borderRadiusLG,
    //border: 'none',
  };

  const { targetConfig } = parentConfig;

  const getContentItems = (panelStyle: {
    marginBottom: number;
    background: string;
    borderRadius: number;
    //border: string;
  }) => {
    const contentItems = [];
    if (
      targetConfig &&
      (editingEnabled || (targetConfig.metadata && Object.keys(targetConfig.metadata).length > 0))
    ) {
      contentItems.push({
        key: 'meta',
        label: 'Meta Data',
        children: [
          <Content
            contentType="metadata"
            editingEnabled={editingEnabled}
            configId={targetConfig.id}
            configType="target-config"
            data={targetConfig.metadata}
            parentConfig={parentConfig}
          />,
        ],
        style: { ...panelStyle, border: '1px solid #87e8de' }, //cyan-3
      });
    }
    if (
      targetConfig &&
      (editingEnabled ||
        (targetConfig.parameters && Object.keys(targetConfig.parameters).length > 0))
    ) {
      contentItems.push({
        key: 'param',
        label: 'Parameters',
        children: [
          <Content
            contentType="parameters"
            editingEnabled={editingEnabled}
            configId={targetConfig.id}
            configType="target-config"
            data={targetConfig.parameters}
            parentConfig={parentConfig}
          />,
        ],
        style: { ...panelStyle, border: '1px solid #b7eb8f' }, //green-3
      });
    }
    return contentItems;
  };

  const activeKeys = [];
  if (
    targetConfig &&
    (editingEnabled || (targetConfig.metadata && Object.keys(targetConfig.metadata).length > 0))
  ) {
    activeKeys.push('meta');
  }
  if (
    targetConfig &&
    (editingEnabled || (targetConfig.parameters && Object.keys(targetConfig.parameters).length > 0))
  ) {
    activeKeys.push('param');
  }

  return (
    <Collapse
      bordered={false}
      expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
      defaultActiveKey={activeKeys}
      style={{
        background: 'none',
      }}
      items={getContentItems(panelStyle)}
    />
  );
};

export default TargetConfiguration;

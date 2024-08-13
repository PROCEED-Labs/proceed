'use client';

import { ParentConfig } from '@/lib/data/machine-config-schema';

import { Collapse, theme } from 'antd';
import { CaretRightOutlined } from '@ant-design/icons';
import Content from './config-content';

type MachineDataViewProps = {
  configId: string;
  parentConfig: ParentConfig;
  backendSaveParentConfig: Function;
  editingEnabled: boolean;
};

const TargetConfiguration: React.FC<MachineDataViewProps> = ({
  configId,
  parentConfig,
  backendSaveParentConfig: saveParentConfig,
  editingEnabled,
}) => {
  const { token } = theme.useToken();
  const panelStyle = {
    marginBottom: 20,
    background: token.colorFillAlter,
    borderRadius: token.borderRadiusLG,
    //border: 'none',
  };

  const getContentItems = (panelStyle: {
    marginBottom: number;
    background: string;
    borderRadius: number;
    //border: string;
  }): any => {
    const contentItems = [];
    if (
      parentConfig.targetConfig &&
      (editingEnabled ||
        (parentConfig.targetConfig.metadata &&
          Object.keys(parentConfig.targetConfig.metadata).length > 0))
    ) {
      contentItems.push({
        key: 'meta',
        label: 'Meta Data',
        children: [
          <Content
            contentType="metadata"
            editingEnabled={editingEnabled}
            backendSaveParentConfig={saveParentConfig}
            customConfig={parentConfig.targetConfig}
            configId={configId}
            selectedMachineConfig={undefined}
            parentConfig={parentConfig}
          />,
        ],
        style: { ...panelStyle, border: '1px solid #87e8de' }, //cyan-3
      });
    }
    if (
      parentConfig.targetConfig &&
      (editingEnabled ||
        (parentConfig.targetConfig.parameters &&
          Object.keys(parentConfig.targetConfig.parameters).length > 0))
    ) {
      contentItems.push({
        key: 'param',
        label: 'Parameters',
        children: [
          <Content
            contentType="parameters"
            editingEnabled={editingEnabled}
            backendSaveParentConfig={saveParentConfig}
            customConfig={parentConfig.targetConfig}
            configId={configId}
            selectedMachineConfig={undefined}
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
    parentConfig.targetConfig &&
    (editingEnabled ||
      (parentConfig.targetConfig.metadata &&
        Object.keys(parentConfig.targetConfig.metadata).length > 0))
  ) {
    activeKeys.push('meta');
  }
  if (
    parentConfig.targetConfig &&
    (editingEnabled ||
      (parentConfig.targetConfig.parameters &&
        Object.keys(parentConfig.targetConfig.parameters).length > 0))
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

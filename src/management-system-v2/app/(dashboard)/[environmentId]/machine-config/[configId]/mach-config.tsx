'use client';

import { MachineConfig, ParentConfig } from '@/lib/data/machine-config-schema';
import { useRouter } from 'next/navigation';

import { CaretRightOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { Collapse, theme, Modal, Form, Input, message } from 'antd';
import {
  createMachineConfigInParent,
  generateUniqueId,
  deleteMachineConfigInParent,
} from '../configuration-helper';
import ActionButtons from './action-buttons';
import Content from './config-content';

type MachineDataViewProps = {
  configId: string;
  parentConfig: ParentConfig;
  backendSaveParentConfig: Function;
  editingEnabled: boolean;
};

const MachineConfigurations: React.FC<MachineDataViewProps> = ({
  configId,
  parentConfig: originalParentConfig,
  backendSaveParentConfig: saveParentConfig,
  editingEnabled,
}) => {
  const router = useRouter();
  const [parentConfig, setParentConfig] = useState<ParentConfig>(originalParentConfig);

  const [copyModalVisible, setCopyModalVisible] = useState(false);
  const [configToCopy, setConfigToCopy] = useState<MachineConfig | null>(null);

  const { token } = theme.useToken();
  const panelStyle = {
    marginBottom: 20,
    background: token.colorFillAlter,
    borderRadius: token.borderRadiusLG,
    //border: 'none',
  };

  const handleCopy = (machineConfig: MachineConfig) => {
    setConfigToCopy(machineConfig);
    setCopyModalVisible(true);
  };

  const handleCopyModalCancel = () => {
    setCopyModalVisible(false);
    setConfigToCopy(null);
  };

  const handleCopyModalCreate = async (values: { name: string; description: string }) => {
    if (configToCopy) {
      const newConfig = {
        ...configToCopy,
        id: generateUniqueId(),
        name: values.name,
        metadata: {
          description: {
            content: [
              {
                value: values.description,
                displayName: 'Description',
                language: 'en',
              },
            ],
          },
        },
        createdOn: new Date().toISOString(),
        lastEditedOn: new Date().toISOString(),
      };
      createMachineConfigInParent(
        parentConfig,
        newConfig.name,
        newConfig.metadata.description.content[0].value,
      );
      await saveParentConfig(configId, parentConfig);
      setParentConfig({ ...parentConfig });
      router.refresh();
    }
    setCopyModalVisible(false);
  };

  const handleDelete = (machineConfigId: string) => {
    deleteMachineConfigInParent(parentConfig, machineConfigId);
    setParentConfig({
      ...parentConfig,
      machineConfigs: parentConfig.machineConfigs.filter((config) => config.id !== machineConfigId),
    });
    saveParentConfig(configId, parentConfig).then(() => {
      message.success('Configuration deleted successfully');
    });
  };

  const CopyMachineConfigModal = ({
    visible,
    onCreate,
    onCancel,
  }: {
    visible: boolean;
    onCreate: (values: { name: string; description: string }) => void;
    onCancel: () => void;
  }) => {
    const [form] = Form.useForm();
    return (
      <Modal
        open={visible}
        title="Copy Machine Configuration"
        okText="Ok"
        cancelText="Cancel"
        onCancel={onCancel}
        onOk={() => {
          form
            .validateFields()
            .then((values) => {
              form.resetFields();
              onCreate(values);
            })
            .catch((info) => {
              console.log('Validate Failed:', info);
            });
        }}
      >
        <Form
          form={form}
          layout="vertical"
          name="form_in_modal"
          initialValues={{ modifier: 'public' }}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[
              { required: true, message: 'Please input the name of the machine configuration!' },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea showCount rows={4} maxLength={150} />
          </Form.Item>
        </Form>
      </Modal>
    );
  };

  const getContentItems = (
    machineConfigData: MachineConfig,
    panelStyle: {
      marginBottom: number;
      background: string;
      borderRadius: number;
      //border: string;
    },
  ): any => {
    const contentItems = [];
    if (
      editingEnabled ||
      (machineConfigData.metadata && Object.keys(machineConfigData.metadata).length > 0)
    ) {
      contentItems.push({
        key: 'meta',
        label: 'Meta Data',
        children: [
          <Content
            contentType="metadata"
            editingEnabled={editingEnabled}
            backendSaveParentConfig={saveParentConfig}
            customConfig={machineConfigData}
            configId={configId}
            selectedMachineConfig={undefined}
            parentConfig={parentConfig}
          />,
        ],
        style: { ...panelStyle, border: '1px solid #87e8de' }, //cyan-3
      });
    }
    if (
      editingEnabled ||
      (machineConfigData.parameters && Object.keys(machineConfigData.parameters).length > 0)
    ) {
      contentItems.push({
        key: 'param',
        label: 'Parameters',
        children: [
          <Content
            contentType="parameters"
            editingEnabled={editingEnabled}
            backendSaveParentConfig={saveParentConfig}
            customConfig={machineConfigData}
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

  const getItems = (panelStyle: {
    marginBottom: number;
    background: string;
    borderRadius: number;
    //border: string;
  }): any => {
    let list = [];
    for (let machineConfig of parentConfig.machineConfigs) {
      const activeKeys = [];
      if (
        editingEnabled ||
        (machineConfig.metadata && Object.keys(machineConfig.metadata).length > 0)
      ) {
        activeKeys.push('meta');
      }
      if (
        editingEnabled ||
        (machineConfig.parameters && Object.keys(machineConfig.parameters).length > 0)
      ) {
        activeKeys.push('param');
      }
      list.push({
        key: machineConfig.id,
        label: machineConfig.name,
        children: [
          <Collapse
            bordered={false}
            expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
            defaultActiveKey={activeKeys}
            style={{
              background: 'none',
            }}
            items={getContentItems(machineConfig, panelStyle)}
          />,
        ],
        extra: (
          <ActionButtons
            editable={editingEnabled}
            options={['copy', 'delete']}
            actions={{
              copy: () => {
                handleCopy(machineConfig);
              },
              delete: () => {
                handleDelete(machineConfig.id);
              },
            }}
          />
        ),

        style: { ...panelStyle, border: '1px solid #adc6ff' }, //geekblue-3
      });
    }
    return list;
  };

  return (
    <>
      <Collapse
        bordered={false}
        expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
        style={{
          background: 'none',
        }}
        items={getItems(panelStyle)}
      />
      <CopyMachineConfigModal
        visible={copyModalVisible}
        onCreate={handleCopyModalCreate}
        onCancel={handleCopyModalCancel}
      />
    </>
  );
};

export default MachineConfigurations;

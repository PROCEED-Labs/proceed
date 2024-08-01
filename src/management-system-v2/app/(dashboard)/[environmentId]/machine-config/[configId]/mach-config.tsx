'use client';

import { MachineConfig, ParentConfig } from '@/lib/data/machine-config-schema';
import { useRouter, useSearchParams } from 'next/navigation';

import { CaretRightOutlined, CopyOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useEffect, useRef, useState } from 'react';
import { Collapse, theme, Tooltip, Modal, Form, Input, message } from 'antd';
import useMobileModeler from '@/lib/useMobileModeler';
import { useEnvironment } from '@/components/auth-can';
import {
  TreeFindStruct,
  defaultConfiguration,
  findConfig,
  createMachineConfigInParent,
  generateUniqueId,
  deleteMachineConfigInParent,
} from '../configuration-helper';
import getTooltips from './tooltips';
import Content from './config-content';

type MachineDataViewProps = {
  configId: string;
  selectedConfig: TreeFindStruct;
  parentConfig: ParentConfig;
  backendSaveParentConfig: Function;
  editingEnabled: boolean;
};

const LATEST_VERSION = { version: -1, name: 'Latest Version', description: '' };

export default function MachineConfigurations(props: MachineDataViewProps) {
  const router = useRouter();
  const environment = useEnvironment();
  const query = useSearchParams();

  const firstRender = useRef(true);
  const [parentConfig, setParentConfig] = useState<ParentConfig>({ ...props.parentConfig });
  const saveParentConfig = props.backendSaveParentConfig;
  const configId = props.configId;
  const editingConfig = props.selectedConfig
    ? { ...props.selectedConfig.selection }
    : defaultConfiguration();

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
  }, [props.selectedConfig]);

  const showMobileView = useMobileModeler();

  const editable = props.editingEnabled;
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

  const handleCopyModalCreate = (values: { name: string; description: string }) => {
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
      saveParentConfig(configId, parentConfig).then(() => {
        setParentConfig({ ...parentConfig });
        router.refresh();
      });
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
      editable ||
      (machineConfigData.metadata && Object.keys(machineConfigData.metadata).length > 0)
    ) {
      contentItems.push({
        key: 'meta',
        label: 'Meta Data',
        children: [
          <Content
            contentType="metadata"
            editingEnabled={editable}
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
      editable ||
      (machineConfigData.parameters && Object.keys(machineConfigData.parameters).length > 0)
    ) {
      contentItems.push({
        key: 'param',
        label: 'Parameters',
        children: [
          <Content
            contentType="parameters"
            editingEnabled={editable}
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
      if (editable || (machineConfig.metadata && Object.keys(machineConfig.metadata).length > 0)) {
        activeKeys.push('meta');
      }
      if (
        editable ||
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
        extra: getTooltips(editable, ['copy', 'delete'], {
          copy: () => {
            handleCopy(machineConfig);
          },
          delete: () => {
            handleDelete(machineConfig.id);
          },
        }),
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
}

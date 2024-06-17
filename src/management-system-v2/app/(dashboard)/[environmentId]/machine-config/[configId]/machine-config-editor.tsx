'use client';

import { MachineConfig, MachineConfigInput } from '@/lib/data/machine-config-schema';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  PlusOutlined,
  MinusOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  ArrowUpOutlined,
  EditOutlined,
  KeyOutlined,
  UserOutlined,
  DeleteOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import TextArea from 'antd/es/input/TextArea';
import { useEffect, useRef, useState } from 'react';
import {
  Breadcrumb,
  Button,
  Cascader,
  Checkbox,
  ColorPicker,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Radio,
  Select,
  Slider,
  Switch,
  TreeSelect,
  Upload,
  Modal,
  Space,
  Divider,
  Col,
  Row,
  Table,
  Tag,
  TableProps,
  Tooltip,
  Layout,
  Tree,
  Typography,
  SelectProps,
  TreeDataNode,
  theme,
  Card,
  MenuProps,
  Dropdown,
} from 'antd';
import { ToolbarGroup } from '@/components/toolbar';
import VersionCreationButton from '@/components/version-creation-button';
import { spaceURL } from '@/lib/utils';
import useMobileModeler from '@/lib/useMobileModeler';
import { useEnvironment } from '@/components/auth-can';
import { config } from 'process';
import { v4 } from 'uuid';
import { EventDataNode } from 'antd/es/tree';
import { Key } from 'antd/es/table/interface';
import MachineTreeView from './machine-tree-view';
import MachineDataEditor from './machine-metadata-editor';

const { Header, Footer, Sider, Content } = Layout;
const { Title } = Typography;

type VariableType = {
  name: string;
  type: string;
  value: string;
};

type VariablesEditorProps = {
  configId: string;
  originalMachineConfig: MachineConfig;
  backendSaveMachineConfig: Function;
  backendCreateMachineConfig: Function;
};

export default function MachineConfigEditor(props: VariablesEditorProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<MachineConfig | undefined>(undefined);

  const configId = props.configId;
  const saveMachineConfig = props.backendSaveMachineConfig;
  const machineConfig = { ...props.originalMachineConfig };

  useEffect(() => {
    setSelectedConfig(machineConfig);
  }, []);

  const onSelectConfig = (relation: { parent: MachineConfig; selection: MachineConfig }) => {
    setSelectedConfig(relation.selection);
  };

  return (
    <Layout style={{ height: '100vh' }}>
      <Sider
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={300}
        style={{ background: '#fff' }}
      >
        <div style={{ width: '100%', padding: collapsed ? '0' : '16px' }}>
          {!collapsed && (
            <>
              <MachineTreeView
                onSelectConfig={onSelectConfig}
                backendSaveMachineConfig={saveMachineConfig}
                configId={configId}
                originalMachineConfig={machineConfig}
              />
            </>
          )}
        </div>
      </Sider>
      <Button
        type="text"
        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        onClick={() => setCollapsed(!collapsed)}
        style={{ fontSize: '24px' }}
      />
      <MachineDataEditor
        backendSaveMachineConfig={saveMachineConfig}
        configId={configId}
        rootMachineConfig={machineConfig}
        editingMachineConfig={selectedConfig}
      />
    </Layout>
  );
}

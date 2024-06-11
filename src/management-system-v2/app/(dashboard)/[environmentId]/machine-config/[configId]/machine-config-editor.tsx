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
} from 'antd';
import { ToolbarGroup } from '@/components/toolbar';
import VersionCreationButton from '@/components/version-creation-button';
import { spaceURL } from '@/lib/utils';
import useMobileModeler from '@/lib/useMobileModeler';
import { useEnvironment } from '@/components/auth-can';
import { config } from 'process';
import { v4 } from 'uuid';

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

function defaultMachineConfig() {
  const date = new Date().toUTCString();
  return {
    id: v4(),
    type: 'machine-config',
    environmentId: '',
    owner: '',
    name: 'Default Machine Configuration',
    description: '',
    variables: [],
    departments: [],
    inEditingBy: [],
    createdOn: date,
    lastEdited: date,
    sharedAs: 'protected',
    shareTimestamp: 0,
    allowIframeTimestamp: 0,
    versions: [],
    folderId: '',
    targetConfigs: [],
    machineConfigs: [],
  } as MachineConfig;
}

const LATEST_VERSION = { version: -1, name: 'Latest Version', description: '' };

export default function MachineConfigEditor(props: VariablesEditorProps) {
  const router = useRouter();
  const environment = useEnvironment();
  const query = useSearchParams();

  const [variables, setVariables] = useState<VariableType[]>([]);
  const firstRender = useRef(true);
  const [collapsed, setCollapsed] = useState(false);
  const [editingName, setEditingName] = useState(false);

  const machineConfig = { ...props.originalMachineConfig };
  const saveMachineConfig = props.backendSaveMachineConfig;
  const createMachineConfig = props.backendSaveMachineConfig;
  const configId = props.configId;
  const selectedVersionId = query.get('version');

  const selectedVersion =
    machineConfig.versions.find(
      (version) => version.version === parseInt(selectedVersionId ?? '-1'),
    ) ?? LATEST_VERSION;
  const filterOption: SelectProps['filterOption'] = (input, option) =>
    ((option?.label as string) ?? '').toLowerCase().includes(input.toLowerCase());

  function saveVariables() {
    machineConfig.variables = variables;
    saveMachineConfig(configId, machineConfig).then((res: MachineConfigInput) => {});
    router.refresh();
  }

  const changeName = (e: any) => {
    let newName = e.target.value;
    machineConfig.name = newName;
    saveMachineConfig(configId, machineConfig).then(() => {});
    router.refresh();
  };

  const changeDescription = (e: any) => {
    let newDescription = e.target.value;
    machineConfig.description = newDescription;
    saveMachineConfig(configId, machineConfig).then(() => {});
    router.refresh();
  };

  function changeVarName(e: any) {
    let idx = e.target.getAttribute('data-key');
    variables[idx].name = e.target.value;
    setVariables(variables);
    saveVariables();
  }

  function changeVarType(e: any) {
    let idx = e.target.getAttribute('data-key');
    variables[idx].type = e.target.value;
    setVariables(variables);
    saveVariables();
  }

  function changeVarValue(e: any) {
    let idx = e.target.getAttribute('data-key');
    variables[idx].value = e.target.value;
    setVariables(variables);
    saveVariables();
  }

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      setVariables(machineConfig.variables);
      return;
    }
    saveVariables();
  }, [variables, machineConfig.name]);

  const addNewVariable = () => {
    setVariables(variables.concat([{ name: '', type: '', value: '' }]));
  };
  const removeVariable = (e: any) => {
    var idx = e.currentTarget.getAttribute('data-key');
    setVariables(
      variables.filter((_, i) => {
        return i.toString() !== idx;
      }),
    );
  };

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newVariableName, setNewVariableName] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const showMobileView = useMobileModeler();

  const discardChanges = () => {
    setIsModalVisible(false);
  };
  const setModalVisible = () => {
    setIsModalVisible(true);
  };
  const saveVariable = () => {
    /*
    if (editingIndex !== null) {
      const updatedVariables = variables.map((val, i) => i === editingIndex ? { name: newVariableName } : val);
      setVariables(updatedVariables);
    } else {
      setVariables([...variables, { name: newVariableName }]);
    }
    setIsModalVisible(false);
    */
  };

  const editVariable = (/*index*/) => {
    /*
    setNewVariableName(variables[index].name);
    setEditingIndex(index);
    setIsModalVisible(true);
    */
  };
  interface DataType {
    key: string;
    name: string;
    age: number;
    address: string;
    tags: string[];
  }
  const [treeData, setTreeData] = useState<TreeDataNode[]>([]);

  const machineConfigToTreeElement = (_machineConfig: MachineConfig) => {
    return {
      title: _machineConfig.name,
      key: _machineConfig.id,
      ref: _machineConfig,
      children: [],
    };
  };

  const mountTreeData = (_machineConfig: MachineConfig, level: number) => {
    const list = [];
    for (let childrenConfig of _machineConfig.targetConfigs) {
      let childNode: TreeDataNode = machineConfigToTreeElement(childrenConfig);
      childNode.children = mountTreeData(childrenConfig, level + 1);
      list.push(childNode);
    }
    for (let childrenConfig of _machineConfig.machineConfigs) {
      let childNode: TreeDataNode = machineConfigToTreeElement(childrenConfig);
      childNode.children = mountTreeData(childrenConfig, level + 1);
      list.push(childNode);
    }
    return list;
  };

  useEffect(() => {
    let configArray: TreeDataNode[] = [machineConfigToTreeElement(machineConfig)];
    configArray[0].children = mountTreeData(machineConfig, 0);
    setTreeData(configArray);
  }, []);

  const createConfigVersion = async (values: {
    versionName: string;
    versionDescription: string;
  }) => {
    console.log(values.versionName, values.versionDescription);
    router.refresh();
  };

  const createTarget = () => {
    machineConfig.targetConfigs.push({
      ...defaultMachineConfig(),
      name: machineConfig.name + '-child-target-' + machineConfig.targetConfigs.length,
      type: 'machine-config',
      owner: machineConfig.owner,
      environmentId: machineConfig.environmentId,
    });
    saveMachineConfig(configId, machineConfig).then(() => {});
    router.refresh();
  };
  const createMachine = () => {
    machineConfig.machineConfigs.push({
      ...defaultMachineConfig(),
      name: machineConfig.name + '-child-machine-' + machineConfig.machineConfigs.length,
      type: 'machine-config',
      owner: machineConfig.owner,
      environmentId: machineConfig.environmentId,
    });
    saveMachineConfig(configId, machineConfig).then(() => {});
    router.refresh();
  };

  const onLoadData = (treeNode: TreeDataNode) =>
    new Promise((resolve) => {
      if (treeNode.children) {
        resolve(treeNode);
        return;
      }
      router.refresh();
    });

  const toggleEditingName = () => {
    // if (editingName) {
    //   saveMachineConfig(configId, machineConfig).then(() => {});
    // }
    setEditingName(!editingName);
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
          {!collapsed && <Tree loadData={onLoadData} treeData={treeData} />}
        </div>
      </Sider>
      <Layout>
        <Header
          style={{ background: '#fff', padding: '0 16px', display: 'flex', alignItems: 'center' }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '24px' }}
          />
          <Divider orientation="left" style={{ margin: '0 16px' }}>
            <Title level={3} style={{ margin: 0 }}>
              Configuration&nbsp;
              {!editingName ? (
                <>{machineConfig.name}</>
              ) : (
                <Input defaultValue={machineConfig.name} onChange={changeName} />
              )}
              &nbsp;
              <Button>
                <EditOutlined onClick={toggleEditingName} />
              </Button>
              &nbsp;
              <ToolbarGroup>
                <Select
                  popupMatchSelectWidth={false}
                  placeholder="Select Version"
                  showSearch
                  filterOption={filterOption}
                  value={{
                    value: selectedVersion.version,
                    label: selectedVersion.name,
                  }}
                  onSelect={(_, option) => {
                    // change the version info in the query but keep other info (e.g. the currently open subprocess)
                    const searchParams = new URLSearchParams(query);
                    if (!option.value || option.value === -1) searchParams.delete('version');
                    else searchParams.set(`version`, `${option.value}`);
                    router.push(
                      spaceURL(
                        environment,
                        `/machine-config/${configId as string}${
                          searchParams.size ? '?' + searchParams.toString() : ''
                        }`,
                      ),
                    );
                  }}
                  options={[LATEST_VERSION]
                    .concat(machineConfig.versions ?? [])
                    .map(({ version, name }) => ({
                      value: version,
                      label: name,
                    }))}
                />
                {!showMobileView && (
                  <>
                    <Tooltip title="Create New Version">
                      <VersionCreationButton
                        icon={<PlusOutlined />}
                        createVersion={createConfigVersion}
                      ></VersionCreationButton>
                    </Tooltip>
                    <Tooltip title="Back to parent">
                      <Button icon={<ArrowUpOutlined />} disabled={true} />
                    </Tooltip>
                  </>
                )}
              </ToolbarGroup>
            </Title>
          </Divider>
        </Header>
        <Content style={{ margin: '24px 16px 0', padding: '16px', background: '#fff' }}>
          <Row gutter={16} style={{ marginTop: '16px' }}>
            <Col span={8}>
              <label>
                ID:
                <Input value={machineConfig.id} disabled prefix={<KeyOutlined />} />
                Owner:
                <Input
                  value={machineConfig.owner.split('|').pop()}
                  disabled
                  prefix={<UserOutlined />}
                />
              </label>
            </Col>
            <Col span={8}>
              <label>
                Description:
                <TextArea defaultValue={machineConfig.description} onChange={changeDescription} />
              </label>
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: '16px' }}>
            <Col span={24}>
              Variables: <Button onClick={addNewVariable} icon={<PlusOutlined />} type="primary" />
              {variables.map((val, i) => (
                <div key={i} style={{ marginTop: '16px' }}>
                  <Row gutter={16}>
                    <Col span={6}>
                      <label>
                        Name:
                        <Input data-key={i} value={val.name} onChange={changeVarName} readOnly />
                      </label>
                    </Col>
                    <Col span={6}>
                      <label>
                        Type:
                        <Input data-key={i} value={val.type} onChange={changeVarType} readOnly />
                      </label>
                    </Col>
                    <Col span={6}>
                      <label>
                        Value:
                        <Input data-key={i} value={val.value} onChange={changeVarValue} readOnly />
                      </label>
                    </Col>
                    <Col span={6}>
                      <Button
                        data-key={i}
                        onClick={removeVariable}
                        icon={<MinusOutlined />}
                        style={{ marginTop: '24px' }}
                        type="primary"
                      />
                    </Col>
                  </Row>
                </div>
              ))}
              <Modal
                title="Enter Variable Details"
                open={isModalVisible}
                footer={[
                  <Button key="back" onClick={discardChanges}>
                    Discard
                  </Button>,
                  <Button key="submit" type="primary" onClick={saveVariable}>
                    Save
                  </Button>,
                ]}
              >
                <Input
                  placeholder="Variable Name"
                  value={newVariableName}
                  onChange={(e) => setNewVariableName(e.target.value)}
                />
              </Modal>
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: '32px' }}>
            <Col span={12}>
              <Button onClick={createTarget} type="primary">
                Create Target Configuration
              </Button>
            </Col>
            <Col span={12}>
              <Button onClick={createMachine} type="primary">
                Create Machine Configuration
              </Button>
            </Col>
          </Row>
        </Content>
      </Layout>
    </Layout>
  );
}

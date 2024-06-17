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
  const [collapsed, setCollapsed] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [machineConfigList, setMachineConfigList] = useState<MachineConfig[]>([]);
  const [targetConfigList, setTargetConfigList] = useState<MachineConfig[]>([]);

  const machineConfig = { ...props.originalMachineConfig };
  const saveMachineConfig = props.backendSaveMachineConfig;
  const createMachineConfig = props.backendSaveMachineConfig;
  const configId = props.configId;
  const selectedVersionId = query.get('version');
  const [nestedParameters, setNestedParameters] = useState([]); // State for nested parameters

  //Added by Antoni
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  const addNestedParameter = () => {
    setNestedParameters([...nestedParameters, { key: '', value: '', unit: '', language: '' }]);
  };

  const changeNestedParameter = (index, key, value) => {
    const newNestedParameters = [...nestedParameters];
    newNestedParameters[index][key] = value;
    setNestedParameters(newNestedParameters);
  };

  const removeNestedParameter = (index) => {
    setNestedParameters(nestedParameters.filter((_, i) => i !== index));
  };
  ////

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
      setMachineConfigList(machineConfig.machineConfigs);
      setTargetConfigList(machineConfig.targetConfigs);
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
  const showMobileView = useMobileModeler();

  const discardChanges = () => {
    setIsModalVisible(false);
  };

  const [treeData, setTreeData] = useState<TreeDataNode[]>([]);

  const machineConfigToTreeElement = (_machineConfig: MachineConfig) => {
    return {
      title: _machineConfig.name,
      key: _machineConfig.id,
      ref: _machineConfig,
      children: [],
    };
  };

  const searchTreeData = (_machineConfig: MachineConfig, level: number) => {
    const list = [];

    const targetConfigs = Array.isArray(_machineConfig.targetConfigs)
      ? _machineConfig.targetConfigs
      : [];
    for (let childrenConfig of targetConfigs) {
      let childNode: TreeDataNode = machineConfigToTreeElement(childrenConfig);
      childNode.children = searchTreeData(childrenConfig, level + 1);
      list.push(childNode);
    }
    const machineConfigs = Array.isArray(_machineConfig.machineConfigs)
      ? _machineConfig.machineConfigs
      : [];
    for (let childrenConfig of machineConfigs) {
      let childNode: TreeDataNode = machineConfigToTreeElement(childrenConfig);
      childNode.children = searchTreeData(childrenConfig, level + 1);
      list.push(childNode);
    }
    return list;
  };

  const columns: TableProps<MachineConfig>['columns'] = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <a>{text}</a>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Created At',
      dataIndex: 'createdOn',
      key: 'createdOn',
    },
  ];

  const mountTreeData = () => {
    let configArray: TreeDataNode[] = [machineConfigToTreeElement(machineConfig)];
    configArray[0].children = searchTreeData(machineConfig, 0);
    setTreeData(configArray);
  };

  useEffect(() => {
    mountTreeData();
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
      name: machineConfig.name + '-target-' + machineConfig.targetConfigs.length,
      type: 'machine-config',
      owner: machineConfig.owner,
      environmentId: machineConfig.environmentId,
    });
    setTargetConfigList(machineConfig.targetConfigs);
    saveMachineConfig(configId, machineConfig).then(() => {});
    mountTreeData();
    router.refresh();
  };

  const createMachine = () => {
    machineConfig.machineConfigs.push({
      ...defaultMachineConfig(),
      name: machineConfig.name + '-machine-' + machineConfig.machineConfigs.length,
      type: 'machine-config',
      owner: machineConfig.owner,
      environmentId: machineConfig.environmentId,
    });
    setMachineConfigList(machineConfig.machineConfigs);
    saveMachineConfig(configId, machineConfig).then(() => {});
    mountTreeData();
    router.refresh();
  };

  const onLoadData = (treeNode: TreeDataNode) =>
    new Promise((resolve) => {
      if (treeNode.children) {
        resolve(treeNode);
        return;
      }
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
        <Content
          style={{
            margin: '24px 16px 0',
            padding: '16px',
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            minHeight: 'auto',
            height: 'auto',
          }}
        >
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
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: '16px' }}>
            <Col span={24}>
              <Card title="Target Configuration" style={{ marginBottom: 16 }}>
                <Input placeholder="Target Config Name" style={{ marginBottom: 16 }} />
                <Row gutter={16}>
                  <Col span={8}>
                    <Input placeholder="ID" />
                  </Col>
                  <Col span={8}>
                    <Select defaultValue="Version" style={{ width: '100%' }}>
                      <Option value="version1">Version 1</Option>
                      <Option value="version2">Version 2</Option>
                    </Select>
                  </Col>
                  <Col span={8}>
                    <Input placeholder="Owner" />
                  </Col>
                </Row>
                <Divider />
                <Title level={5}>Linked Machine Configurations</Title>
                <Space wrap>
                  <Tag color="green">ID ABC</Tag>
                  <Tag color="purple">ID XYZ</Tag>
                  <Tag color="magenta">ID LMN</Tag>
                  <Button icon={<PlusOutlined />} type="dashed" />
                </Space>
              </Card>
              <Card title="Target Parameters" bodyStyle={{ paddingBottom: 16 }}>
                <Button
                  icon={<PlusOutlined />}
                  type="dashed"
                  style={{ width: '100%', marginBottom: 16 }}
                  onClick={addNestedParameter}
                >
                  Add Parameter
                </Button>
                {nestedParameters.map((param, i) => (
                  <Card
                    key={i}
                    type="inner"
                    title={`Nested Parameter ${i + 1}`}
                    extra={
                      <Button
                        icon={<MinusOutlined />}
                        type="dashed"
                        onClick={() => removeNestedParameter(i)}
                      />
                    }
                    style={{ marginBottom: 16 }}
                  >
                    <Row gutter={16} style={{ marginBottom: 16 }}>
                      <Col span={6}>
                        <Input
                          placeholder="Key"
                          //value={param.key}
                          onChange={(e) => changeNestedParameter(i, 'key', e.target.value)}
                        />
                      </Col>
                      <Col span={6}>
                        <Input
                          placeholder="Value"
                          //value={param.value}
                          onChange={(e) => changeNestedParameter(i, 'value', e.target.value)}
                        />
                      </Col>
                      <Col span={6}>
                        <Input
                          placeholder="Unit"
                          //value={param.unit}
                          onChange={(e) => changeNestedParameter(i, 'unit', e.target.value)}
                        />
                      </Col>
                      <Col span={6}>
                        <Input
                          placeholder="Language"
                          //value={param.language}
                          onChange={(e) => changeNestedParameter(i, 'language', e.target.value)}
                        />
                      </Col>
                    </Row>
                    <Row gutter={16} style={{ marginBottom: 16 }}>
                      <Col span={24}>
                        <Space>
                          <Tag color="purple">Key XY</Tag>
                          <Tag color="blue">Key AB</Tag>
                          <Button icon={<PlusOutlined />} type="dashed" />
                        </Space>
                      </Col>
                    </Row>
                    <Row gutter={16} justify="start">
                      <Space>
                        <Tooltip title="Copy">
                          <Button icon={<CopyOutlined />} shape="circle" />
                        </Tooltip>
                        <Tooltip title="Edit">
                          <Button icon={<EditOutlined />} shape="circle" />
                        </Tooltip>
                        <Tooltip title="Delete">
                          <Button icon={<DeleteOutlined />} shape="circle" />
                        </Tooltip>
                      </Space>
                      <Button type="link" icon={<PlusOutlined />}>
                        Create Custom Parameter
                      </Button>
                    </Row>
                  </Card>
                ))}
              </Card>
            </Col>
          </Row>
        </Content>
      </Layout>
    </Layout>
  );
}

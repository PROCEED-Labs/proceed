'use client';

import { MachineConfig, MachineConfigInput } from '@/lib/data/machine-config-schema';
import { PlusOutlined, MinusOutlined } from '@ant-design/icons';
import { Breadcrumb, Input, Button, Form } from 'antd';
import { Col, Divider, Row } from 'antd';
import TextArea from 'antd/es/input/TextArea';
import { useEffect, useRef, useState } from 'react';

type VariableType = {
  name: string;
  type: string;
  value: string;
};

type VariablesEditorProps = {
  configId: string;
  originalMachineConfig: MachineConfig;
  onChange: Function;
};

export default function MachineConfigEditor(props: VariablesEditorProps) {
  const [variables, setVariables] = useState<VariableType[]>([]);
  const firstRender = useRef(true);
  const machineConfig = props.originalMachineConfig;
  const saveMachineConfig = props.onChange;
  const configId = props.configId;

  function saveVariables() {
    machineConfig.variables = variables;
    saveMachineConfig(configId, machineConfig).then((res: MachineConfigInput) => {});
  }

  const changeName = (e) => {
    let newName = e.target.value;
    machineConfig.name = newName;
    saveMachineConfig(configId, machineConfig).then(() => {});
  };

  const changeDescription = (e) => {
    let newDescription = e.target.value;
    machineConfig.description = newDescription;
    saveMachineConfig(configId, machineConfig).then(() => {});
  };

  function changeVarName(e) {
    let idx = e.target.getAttribute('data-key');
    variables[idx].name = e.target.value;
    setVariables(variables);
    saveVariables();
  }

  function changeVarType(e) {
    let idx = e.target.getAttribute('data-key');
    variables[idx].type = e.target.value;
    setVariables(variables);
    saveVariables();
  }

  function changeVarValue(e) {
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
  const removeVariable = (e) => {
    var idx = e.currentTarget.getAttribute('data-key');
    setVariables(
      variables.filter((_, i) => {
        console.log(i.toString() !== idx);
        return i.toString() !== idx;
      }),
    );
  };
  return (
    <div>
      {/* <Space direction="vertical" size="large" style={{ display: 'flex', height: '100%' }}> */}
      <Divider orientation="left">
        <Breadcrumb
          items={[
            {
              title: <h3>Machine Configuration {machineConfig.name}</h3>,
            },
          ]}
        />
      </Divider>
      <Row>
        <Col flex={1}>
          <label>
            Name:
            <Input defaultValue={machineConfig.name} onChange={changeName}></Input>
          </label>
        </Col>
        <Col flex={6}></Col>
      </Row>
      <Row>
        <Col flex={1}>
          <label>
            Description:
            <TextArea
              defaultValue={machineConfig.description}
              onChange={changeDescription}
            ></TextArea>
          </label>
        </Col>
        <Col flex={6}></Col>
      </Row>
      <Row>
        <Col flex={1}>
          <br />
          Variables: <Button onClick={addNewVariable} icon={<PlusOutlined />}></Button>
          <br />
          {variables.map((val, i) => {
            return (
              <div key={i}>
                <br />
                <Row>
                  <Col flex={1}>
                    Name:
                    <Input data-key={i} defaultValue={val.name} onChange={changeVarName} />
                  </Col>
                  <Col flex={1}>
                    Type:
                    <Input data-key={i} defaultValue={val.type} onChange={changeVarType} />
                  </Col>
                  <Col flex={1}>
                    Value:
                    <Input data-key={i} defaultValue={val.value} onChange={changeVarValue} />
                  </Col>
                  <Col flex={1}>
                    <br />
                    <Button data-key={i} onClick={removeVariable} icon={<MinusOutlined />}></Button>
                  </Col>
                </Row>
              </div>
            );
          })}
        </Col>
        <Col flex={6}></Col>
      </Row>
      <br />
    </div>
  );
}

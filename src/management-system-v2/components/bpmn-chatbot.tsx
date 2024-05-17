import { BPMNCanvasRef } from '@/components/bpmn-canvas';
import { Button, Card, Form, Input, List, Space, Tooltip } from 'antd';
import React, { useState } from 'react';
import { getNewShapePosition } from 'bpmn-js/lib/features/auto-place/BpmnAutoPlaceUtil';
import { Shape } from 'bpmn-js/lib/model/Types';
import { MessageOutlined } from '@ant-design/icons';

type ChatbotDialogProps = {
  show: boolean;
  modeler: BPMNCanvasRef | null;
};

type FieldType = {
  prompt: string;
};

const ChatbotDialog: React.FC<ChatbotDialogProps> = ({ show, modeler }) => {
  const [lastPrompts, setLastPrompts] = useState<string[]>([]);
  const [waitForResponse, setWaitForResponse] = useState(false);
  const elementFactory = modeler!.getElementFactory();
  const root = modeler!.getCurrentRoot();
  const modeling = modeler!.getModeling();

  function onPrompt({ prompt }: FieldType) {
    setWaitForResponse(true);
    getProcessXml()
      .then((process) => {
        console.log(process);
        return fetchClaude(prompt, process);
      })
      .then((res) => {
        console.log(res);
        processResponse(res.content);
        setLastPrompts(lastPrompts.concat(prompt));
      })
      .finally(() => setWaitForResponse(false));
  }

  function processResponse(response: any[]) {
    const created: Shape[] = [];
    response.forEach((res) => {
      if (res.type == 'tool_use') {
        if (res.name == 'create_and_append_task') {
          const task = elementFactory.createShape({
            type: 'bpmn:Task',
            name: res.input.new_task_name,
          });
          let sourceShape = modeler?.getElement(res.input.source_task_id_or_name) as Shape;
          if (!sourceShape) {
            sourceShape = created.find((e) => e.name == res.input.source_task_id_or_name)!;
          }
          const point = getNewShapePosition(sourceShape, task);
          modeling.appendShape(sourceShape, task, point, root!);
          created.push(task);
        } else if (res.name == 'create_end') {
          const endEvent = elementFactory.createShape({
            type: 'bpmn:EndEvent',
          });
          let sourceShape = modeler?.getElement(res.input.element_id_or_name) as Shape;
          if (!sourceShape) {
            sourceShape = created.find((e) => e.name == res.input.element_id_or_name)!;
          }
          const point = getNewShapePosition(sourceShape, endEvent);
          modeling.appendShape(sourceShape, endEvent, point, root!);
          created.push(endEvent);
        } else if (res.name == 'create_start') {
          const startEvent = modeling.createShape(
            {
              type: 'bpmn:StartEvent',
              name: res.input.name,
            },
            { x: 350, y: 200 },
            root!,
          );
          created.push(startEvent);
        }
      }
    });
  }

  function getProcessXml(): Promise<string> {
    return modeler!.getXML().then((res) => {
      if (res) {
        const startIndex = res.indexOf('<process ');
        const endIndex = res.indexOf('</process>', startIndex);
        if (endIndex == -1) {
          return '<process></process>';
        }
        return res.slice(startIndex, endIndex) + '</process>';
      } else {
        return '<process></process>';
      }
    });
  }

  function fetchClaude(userPrompt: string, process: string): Promise<any> {
    return fetch('http://localhost:2000/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userPrompt: userPrompt, process: process }),
    }).then((res) => res.json());
  }

  return (
    <Card title="Chatbot" size="small" style={{ width: 400 }} hidden={!show}>
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        <List
          size="small"
          bordered
          style={{ height: 300, overflow: 'auto' }}
          dataSource={lastPrompts}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Tooltip title="Show Response Details">
                  <Button icon={<MessageOutlined />}></Button>
                </Tooltip>,
              ]}
            >
              {item}
            </List.Item>
          )}
        ></List>
        <Form onFinish={onPrompt}>
          <Form.Item<FieldType> name="prompt" rules={[{ required: true }]}>
            <Input.TextArea rows={4} allowClear />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={waitForResponse}>
                Prompt
              </Button>
              <Button type="default" onClick={() => setLastPrompts([])} loading={waitForResponse}>
                Clear Chat
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Space>
    </Card>
  );
};

export default ChatbotDialog;

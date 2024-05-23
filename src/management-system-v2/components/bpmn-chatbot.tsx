import { BPMNCanvasRef } from '@/components/bpmn-canvas';
import { Button, Card, Form, Input, List, Space, Tooltip } from 'antd';
import React, { useState } from 'react';
import { getNewShapePosition } from 'bpmn-js/lib/features/auto-place/BpmnAutoPlaceUtil';
import { Element, Shape } from 'bpmn-js/lib/model/Types';
import { MessageOutlined } from '@ant-design/icons';
import ChatbotResponseModal, { ChatbotInteraction } from './bpmn-chatbot-response';

/*For chatbots that have features like tool use or function calling.
Defines the modeler functionality through JSON Scheme (see: https://json-schema.org/).*/
import tools from './bpmn-chatbot-tools.json';

import { Point } from 'bpmn-js/lib/features/modeling/BpmnFactory';

type ChatbotDialogProps = {
  show: boolean;
  modeler: BPMNCanvasRef | null;
};

type FieldType = {
  prompt: string;
};

const ChatbotDialog: React.FC<ChatbotDialogProps> = ({ show, modeler }) => {
  const [lastPrompts, setLastPrompts] = useState<ChatbotInteraction[]>([]);
  const [waitForResponse, setWaitForResponse] = useState(false);
  const elementFactory = modeler!.getElementFactory();
  const root = modeler!.getCurrentRoot();
  const modeling = modeler!.getModeling();
  const [showChatbotResponseModal, setShowChatbotResponseModal] = useState(false);
  const [chatbotInteraction, setChatbotInteraction] = useState<ChatbotInteraction>();

  function onPrompt({ prompt }: FieldType) {
    setWaitForResponse(true);
    getProcessXml().then((process) => {
      fetchClaude(prompt, process)
        .then((res) => {
          processResponse(res.content);
          setLastPrompts(
            lastPrompts.concat({
              userPrompt: prompt,
              bpmnProcess: process,
              chatbotResponse: res.content,
            }),
          );
        })
        .finally(() => setWaitForResponse(false));
    });
  }

  //see tools definitions
  function create_element(
    bpmn_type: string,
    created: Shape[],
    source_element_id_or_name?: string,
    new_element_name?: string,
    connection_label?: string,
    position?: Point,
  ): void {
    const element = elementFactory.createShape({
      type: 'bpmn:' + bpmn_type,
    });
    let shape: Shape;
    if (source_element_id_or_name) {
      //append element to existing one
      let sourceShape = modeler?.getElement(source_element_id_or_name);
      if (!sourceShape) {
        sourceShape = created.find((e) => e.name == source_element_id_or_name)!;
      }
      const point = getNewShapePosition(sourceShape as Shape, element);
      shape = modeling.appendShape(sourceShape, element, point, root!, {
        connection: { name: connection_label, type: 'bpmn:SequenceFlow' },
      });
    } else {
      shape = modeling.createShape(element, position!, root!);
    }
    if (new_element_name) {
      modeling.updateLabel(shape, new_element_name);
    }
    created.push(shape);
  }
  function create_connection(
    source_element_id_or_name: string,
    target_element_id_or_name: string,
    created: Shape[],
    label?: string,
  ): void {
    let sourceShape = modeler?.getElement(source_element_id_or_name);
    if (!sourceShape) {
      sourceShape = created.find((e) => e.name == source_element_id_or_name)!;
    }
    let targetShape = modeler?.getElement(target_element_id_or_name);
    if (!targetShape) {
      targetShape = created.find((e) => e.name == target_element_id_or_name)!;
    }
    const connection = modeling.createConnection(
      sourceShape,
      targetShape,
      { type: 'bpmn:SequenceFlow' },
      root!,
    );
    if (label) {
      modeling.updateLabel(connection, label);
    }
  }
  function remove_elements(element_ids: string[]): void {
    const elements: Element[] = [];
    element_ids.forEach((id) => {
      let element = modeler?.getElement(id);
      if (element) {
        elements.push(element);
      }
    });
    modeling.removeElements(elements);
  }

  //parsing tool uses listed in response
  function processResponse(response: any[]) {
    const created: Shape[] = [];
    response.forEach((res) => {
      if (res.type == 'tool_use') {
        if (res.name == 'create_element') {
          create_element(
            res.input.bpmn_type,
            created,
            res.input.source_element_id_or_name,
            res.input.new_element_name,
            res.input.connection_label,
            res.input.position,
          );
        } else if (res.name == 'create_connection') {
          create_connection(
            res.input.source_element_id_or_name,
            res.input.target_element_id_or_name,
            created,
            res.input.label,
          );
        } else if (res.name == 'remove_elements') {
          remove_elements(res.input.element_ids);
        }
      }
    });
  }

  //get current xml of the <process>...</process> part only
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

  //prompting an external service for the chatbot
  function fetchClaude(userPrompt: string, process: string): Promise<any> {
    return fetch('http://localhost:2000/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userPrompt: userPrompt, process: process, tools: tools }),
    }).then((res) => res.json());
  }

  return (
    <>
      <Card title="Chatbot" size="small" style={{ width: 400 }} hidden={!show}>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <List
            size="small"
            bordered
            style={{ maxHeight: 300, overflow: 'auto' }}
            dataSource={lastPrompts}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Tooltip title="Show Response Details">
                    <Button
                      icon={<MessageOutlined />}
                      onClick={() => {
                        setChatbotInteraction(item);
                        setShowChatbotResponseModal(true);
                      }}
                    ></Button>
                  </Tooltip>,
                ]}
              >
                <p style={{ maxHeight: 100, overflow: 'clip' }}>{item.userPrompt}</p>
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
      {chatbotInteraction && (
        <ChatbotResponseModal
          open={showChatbotResponseModal}
          onClose={() => setShowChatbotResponseModal(false)}
          chatbotInteraction={chatbotInteraction}
        ></ChatbotResponseModal>
      )}
    </>
  );
};

export default ChatbotDialog;

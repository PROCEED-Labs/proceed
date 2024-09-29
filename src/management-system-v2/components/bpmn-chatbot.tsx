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
  const root = modeler!.getCurrentRoot();
  const modeling = modeler!.getModeling();
  const elementFactory = modeler!.getElementFactory();
  const [showChatbotResponseModal, setShowChatbotResponseModal] = useState(false);
  const [chatbotInteraction, setChatbotInteraction] = useState<ChatbotInteraction>();

  function onPrompt({ prompt }: FieldType) {
    setWaitForResponse(true);
    getProcessXml().then((process) => {
      fetchChatbot(prompt, process)
        .then((res) => {
          processResponse(res);
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
  function append_shape(
    bpmn_type: string,
    new_element_name: string,
    source_element_id_or_name: string,
    created: { name: string; shape: Shape }[],
    label: string,
  ): Shape {
    let source = modeler?.getElement(source_element_id_or_name) as Shape;
    if (!source) {
      console.log(created);
      source = created.find((e) => e.name == source_element_id_or_name)!.shape;
    }
    let shape = elementFactory.createShape({ type: 'bpmn:' + bpmn_type });
    const position = getNewShapePosition(source, shape);
    shape = modeling.createShape({ type: 'bpmn:' + bpmn_type }, position, root!);
    const connection = modeling.createConnection(
      source,
      shape,
      { type: 'bpmn:SequenceFlow' },
      root!,
    );
    modeling.updateLabel(connection, label);
    modeling.updateLabel(shape, new_element_name);
    return shape;
  }
  function create_connection(
    source_element_id_or_name: string,
    target_element_id_or_name: string,
    created: { name: string; shape: Shape }[],
    label?: string,
  ): void {
    let source = modeler?.getElement(source_element_id_or_name) as Shape;
    if (!source) {
      source = created.find((e) => e.name == source_element_id_or_name)!.shape;
    }
    let target = modeler?.getElement(target_element_id_or_name) as Shape;
    if (!target) {
      target = created.find((e) => e.name == target_element_id_or_name)!.shape;
    }
    const connection = modeling.createConnection(
      source,
      target,
      { type: 'bpmn:SequenceFlow' },
      root!,
    );
    if (label) {
      modeling.updateLabel(connection, label);
    }
  }
  function remove_elements(element_ids: string[]): void {
    const elements: Element[] = [];
    element_ids.forEach((e) => {
      const element = modeler?.getElement(e);
      if (element) {
        elements.push(element);
      }
    });

    modeling.removeElements(elements);
  }

  //parsing tool uses listed in response
  function processResponse(response: any[]) {
    const created: { name: string; shape: Shape }[] = [];
    response.forEach((res) => {
      if (res.name == 'create_connection') {
        create_connection(
          res.args.source_element_id_or_name,
          res.args.target_element_id_or_name,
          created,
          res.args.label,
        );
      } else if (res.name == 'remove_elements') {
        remove_elements(res.args.element_ids);
      } else if (res.name == 'append_element') {
        const shape = append_shape(
          res.args.bpmn_type,
          res.args.name,
          res.args.source_element_id_or_name,
          created,
          res.args.label,
        );
        created.push({ name: res.args.name, shape: shape });
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
  function fetchChatbot(userPrompt: string, process: string): Promise<any> {
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

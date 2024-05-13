import { BPMNCanvasRef } from '@/components/bpmn-canvas';
import { mermaid2BPMN } from '@/lib/mermaidParser';
import { Button, Card, Form, Input, List, Space } from 'antd';
import React, { useState } from 'react';

type PromptAndAnswer = {
  userPrompt: string;
  chatbotAnswer: string;
};

export type ChatbotRequest = {
  userPrompt: string;
  lastPrompts: PromptAndAnswer[];
};

type ChatbotDialogProps = {
  handleXmlSave: (bpmn: string) => Promise<void>;
  hidden: boolean;
  modeler: BPMNCanvasRef | null;
};

type FieldType = {
  prompt: string;
};

const ChatbotDialog: React.FC<ChatbotDialogProps> = ({ handleXmlSave, hidden, modeler }) => {
  const [lastPrompts, setLastPrompts] = useState<PromptAndAnswer[]>([]);

  const [waitForResponse, setWaitForResponse] = useState(false);

  function sendPrompt(request: ChatbotRequest): Promise<string> {
    const chatbotResponse = fetch('http://localhost:2000', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    }).then((res) => res.text());
    const xml = modeler?.getXML();
    return Promise.all([chatbotResponse, xml]).then(([res, xml]) => {
      if (xml) {
        handleXmlSave(mermaid2BPMN(res, xml));
      }
      return res;
    });
  }

  function onPrompt({ prompt }: FieldType) {
    setWaitForResponse(true);
    sendPrompt({
      lastPrompts: lastPrompts,
      userPrompt: prompt,
    })
      .then((response) => {
        setLastPrompts(lastPrompts.concat([{ userPrompt: prompt, chatbotAnswer: response }]));
      })
      .finally(() => setWaitForResponse(false));
  }

  function testModeler() {
    const factory = modeler?.getFactory();
  }

  return (
    <Card title="Chatbot" size="small" style={{ width: 400 }} hidden={hidden}>
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        <List
          size="small"
          bordered
          style={{ height: 300, overflow: 'auto' }}
          dataSource={lastPrompts}
          renderItem={(item) => <List.Item>{item.userPrompt}</List.Item>}
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

import { BPMNCanvasRef } from '@/components/bpmn-canvas';
import { Button, Card, Form, Input, List, Space, Tag, Tooltip } from 'antd';
import React, { ReactNode, useRef, useState } from 'react';
import { getNewShapePosition } from 'bpmn-js/lib/features/auto-place/BpmnAutoPlaceUtil';
import { Element, Shape } from 'bpmn-js/lib/model/Types';
import { FileOutlined, MessageOutlined, SendOutlined } from '@ant-design/icons';
import { FaIcons } from 'react-icons/fa6';
import { set } from 'zod';

type ChatbotDialogProps = {
  show: boolean;
  modeler: BPMNCanvasRef | null;
};

type FieldType = {
  prompt: string;
};

const ChatbotDialog: React.FC<ChatbotDialogProps> = ({ show, modeler }) => {
  const [lastPrompts, setLastPrompts] = useState<
    { message: ReactNode; isUser: boolean; bpmn?: string }[]
  >([]);
  const [waitForResponse, setWaitForResponse] = useState(false);
  const [prompt, setPrompt] = useState('');
  const root = modeler!.getCurrentRoot();
  const modeling = modeler!.getModeling();
  //const elementFactory = modeler!.getElementFactory();

  function onPrompt({ prompt }: FieldType) {
    setWaitForResponse(true);
    getProcessXml().then((process) => {
      /*sendToAPI(prompt, process)
        .then((res) => {
          if (res) {
            processResponse(res);
          }
          setLastPrompts(
            lastPrompts.concat({
              userPrompt: prompt,
              bpmnProcess: process,
              chatbotResponse: res,
            }),
          );
        })
        .finally(() => setWaitForResponse(false));*/
    });
  }

  //see tools definitions
  function append_shape(
    bpmn_type: string,
    new_element_name: string,
    source_element_id_or_name: string,
    created: { name: string; shape: Shape }[],
    label: string,
  ) {
    let source = modeler?.getElement(source_element_id_or_name) as Shape;
    if (!source) {
      console.log(created);
      source = created.find((e) => e.name == source_element_id_or_name)!.shape;
    }
    /*let shape = elementFactory.createShape({ type: 'bpmn:' + bpmn_type });
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
    return shape;*/
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
        created.push({ name: res.args.name, shape: shape as any });
      }
    });
  }

  const onSubmit = async () => {
    setPrompt('');
    setLastPrompts((lastPrompts) => lastPrompts.concat({ message: prompt, isUser: true }));
    scrollToBottom();
    await new Promise((resolve) => setTimeout(resolve, 2000));
    if (lastPrompts.filter((p) => !p.isUser).length == 0) {
      setLastPrompts((lastPrompts) =>
        lastPrompts.concat({
          message: "Here's a simple BPMN representation for a vacation application process:",
          isUser: false,
          bpmn: "<process id='vacationApplicationProcess'></process>",
        }),
      );
    } else if (lastPrompts.filter((p) => !p.isUser).length == 1) {
      setLastPrompts((lastPrompts) =>
        lastPrompts.concat({
          message:
            "Sure, here's an updated BPMN process that includes a form reference for the vacation request task:",
          isUser: false,
          bpmn: "<process id='vacationApplicationProcess'></process>",
        }),
      );
    } else if (lastPrompts.filter((p) => !p.isUser).length == 2) {
      setLastPrompts((lastPrompts) =>
        lastPrompts.concat({
          message: (
            <div>
              <p>Here's the updated BPMN XML with element colors.</p>
              <h4>Changes and Features Added:</h4>
              <ol>
                <li>
                  Form Attachment:
                  <ul>
                    <li>
                      The VacationApplicationTask has a form with fields like employeeName,
                      vacationStart, vacationEnd, and reason.
                    </li>
                  </ul>
                </li>
                <li>
                  Color Customization
                  <ul>
                    <li>Green (#5cb85c) for Start Event and Approved End Event.</li>
                    <li>Blue (#337ab7) for the Vacation Request Task.</li>
                    <li>Orange (#f0ad4e) for Manager Approval.</li>
                    <li>Red (#d9534f) for Rejection Gateway and Notification.</li>
                    <li>Light Blue (#5bc0de) for HR Processing.</li>
                  </ul>
                </li>
              </ol>
            </div>
          ),
          isUser: false,
          bpmn: "<process id='vacationApplicationProcess'></process>",
        }),
      );
    } else {
      setLastPrompts((lastPrompts) =>
        lastPrompts.concat({
          message: 'I am a simple chatbot and cannot do much more than this.',
          isUser: false,
        }),
      );
    }
    scrollToBottom();
  };

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

  const listRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (listRef.current) {
      setTimeout(() => {
        listRef.current!.scrollTop = listRef.current!.scrollHeight;
      }, 100);
    }
  };

  return (
    <>
      <Card title="Chatbot" size="small" style={{ width: 400 }} hidden={!show}>
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 190px)' }}>
          <div style={{ overflow: 'auto', flex: 1 }} ref={listRef}>
            <List
              size="small"
              dataSource={lastPrompts}
              renderItem={(item) => (
                <List.Item
                  style={{
                    backgroundColor: item.isUser ? '#f5f5f5' : 'white',
                    borderRadius: 9,
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    marginLeft: item.isUser ? 50 : 0,
                    marginBottom: 5,
                  }}
                  /*actions={[
                  <Tooltip title="Show Response Details">
                    <Button
                      icon={<MessageOutlined />}
                      onClick={() => {
                        setChatbotInteraction(item);
                        setShowChatbotResponseModal(true);
                      }}
                    ></Button>
                  </Tooltip>,
                ]}*/
                >
                  <div>{item.message}</div>
                  {item.bpmn && (
                    <div style={{ marginTop: 5 }}>
                      <Tag icon={<FileOutlined />}>BPMN</Tag>
                    </div>
                  )}
                </List.Item>
              )}
            ></List>
          </div>

          <Space.Compact style={{ width: '100%' }}>
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onPressEnter={onSubmit}
            />
            <Button
              type="primary"
              loading={waitForResponse}
              icon={<SendOutlined />}
              onClick={onSubmit}
            ></Button>
          </Space.Compact>
        </div>
      </Card>
    </>
  );
};
export default ChatbotDialog;

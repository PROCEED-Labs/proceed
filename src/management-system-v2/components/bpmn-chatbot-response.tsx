import { FunctionCall } from '@google/generative-ai';
import { Modal } from 'antd';
import Title from 'antd/es/typography/Title';
import React from 'react';

type ChatbotResponseModalProps = {
  open: boolean;
  onClose: () => void;
  chatbotInteraction: ChatbotInteraction;
};

export type ChatbotInteraction = {
  userPrompt: string;
  bpmnProcess: string;
  chatbotResponse: FunctionCall[] | undefined;
};

const ChatbotResponseModal: React.FC<ChatbotResponseModalProps> = ({
  open,
  onClose,
  chatbotInteraction,
}) => {
  return (
    <Modal title="Response Details" open={open} onCancel={onClose} footer={null}>
      <Title level={5}>User Prompt</Title>
      <p style={{ maxHeight: 300, overflow: 'auto' }}>{chatbotInteraction.userPrompt}</p>
      <Title level={5}>BPMN Process Element</Title>
      <p style={{ maxHeight: 300, overflow: 'auto' }}>{chatbotInteraction.bpmnProcess}</p>
      <Title level={5}>Response Content</Title>
      <p style={{ maxHeight: 300, overflow: 'auto' }}>
        {JSON.stringify(chatbotInteraction.chatbotResponse)}
      </p>
    </Modal>
  );
};

export default ChatbotResponseModal;

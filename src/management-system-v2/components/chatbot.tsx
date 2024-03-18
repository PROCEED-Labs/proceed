'use client';
import { FC, useEffect, useMemo, useRef, useState } from 'react';
import styles from './chatbot.module.scss';
import Scrollbar from './scrollbar';
import Message from './chat-message';
import { Button, Input } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import TextArea from 'antd/es/input/TextArea';
import { useChatStore } from '@/lib/chat-messages-store';
import cn from 'classnames';
import { useIntervalLock } from '@/lib/useIntervalLock';

type ChatBotType = {};

const ChatBot: FC<ChatBotType> = () => {
  const {
    messages: messageLog,
    addUserMessage,
    startSystemMessage,
    addSystemMessage,
  } = useChatStore();

  const numberOfOldMessages = useMemo(() => {
    return messageLog.length;
  }, []);

  const hasAddedInitialMessages = useRef(false);
  useEffect(() => {
    if (numberOfOldMessages > 0 || hasAddedInitialMessages.current) return;
    hasAddedInitialMessages.current = true;
    startSystemMessage();
    setTimeout(() => {
      addSystemMessage({
        message: "Hello, I am PIA, PROCEED's Chatbot 🤖",
        onDone: () => {
          startSystemMessage();
          setTimeout(() => {
            addSystemMessage({
              message: 'How may I assist you?',
              onDone: undefined,
            });
          }, 200);
        },
      });
    }, 500);
  }, []);

  const [inputValue, setInputValue] = useState('');
  const [generatingAnswer, setGeneratingAnswer] = useState(false);

  const queryBot = () => {
    if (inputValue === '') return;
    setGeneratingAnswer(true);

    addUserMessage(inputValue);
    setInputValue('');

    startSystemMessage();
    setTimeout(() => {
      addSystemMessage({
        message: `I am a bot.
        I do not understand your query 💩`,
        onDone: () => {
          startSystemMessage();
          setTimeout(() => {
            addSystemMessage({
              message: 'Is there anything else I can help you with?',
              onDone: () => setGeneratingAnswer(false),
            });
          }, 200);
        },
      });
    }, 5000);
  };

  const messageEndRef = useRef(null);
  const scrollToBottom = () => {
    (messageEndRef.current as unknown as HTMLElement).scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(scrollToBottom, [messageLog]);

  const onDoneWrapper = (cb: any) => {
    return () => {
      cb && cb();
      scrollToBottom();
    };
  };

  const handleEnter = (e: any) => {
    if (e.key === 'Enter' && !e.shiftKey && !generatingAnswer) {
      e.preventDefault();
      queryBot();
    }
  };

  return (
    <>
      <div className={styles.ChatBox}>
        <div className={cn(styles.ChatDialogue, 'Hide-Scroll-Bar')}>
          <Scrollbar>
            <div className={styles.MessageContainer}>
              <span style={{ marginTop: 'auto' }}></span>
              {messageLog.map((msg, index) => (
                <Message
                  key={index}
                  author={msg.author}
                  message={msg.message}
                  loading={msg.loading}
                  onDone={onDoneWrapper(msg.onDone)}
                  oldMessage={index < numberOfOldMessages}
                  scrollToBottom={scrollToBottom}
                />
              ))}
              <span ref={messageEndRef}></span>
            </div>
          </Scrollbar>
        </div>
        <div className={styles.UserInput}>
          <TextArea
            style={{
              width: '90%',
              marginTop: 0,
              top: -15,
              borderTopRightRadius: 0,
              borderBottomRightRadius: 0,
            }}
            value={inputValue}
            count={{
              show: true,
              max: 500,
            }}
            autoSize={{ minRows: 2, maxRows: 2 }}
            onChange={(e) => setInputValue(e.target.value)}
            onPressEnter={handleEnter}
          />
          <Button
            size="large"
            style={{
              width: '10%',
              height: '100%',
              borderTopLeftRadius: 0,
              borderBottomLeftRadius: 0,
            }}
            icon={<SendOutlined rotate={-45} style={{ color: '#1976d2' }} />}
            onClick={queryBot}
            disabled={generatingAnswer}
          ></Button>
        </div>
      </div>
    </>
  );
};

export default ChatBot;

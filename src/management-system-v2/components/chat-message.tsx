import { FC, useEffect, useRef, useState } from 'react';
import styles from './chat-message.module.scss';
import cn from 'classnames';

type MessageType = {
  author: 'user' | 'system';
  message: string;
  loading?: boolean;
  onDone?: () => void;
  oldMessage?: boolean;
  scrollToBottom?: () => void;
};

const Message: FC<MessageType> = ({
  author,
  message,
  loading,
  onDone,
  oldMessage,
  scrollToBottom,
}) => {
  if (loading) {
    scrollToBottom && scrollToBottom();
    return (
      <>
        <div className={cn(styles[author], styles.Message)}>
          <div className={styles.DotContainer}>
            <div className={styles.Dots}></div>
            <div className={styles.Dots}></div>
            <div className={styles.Dots}></div>
          </div>
        </div>
      </>
    );
  }

  let [displayedMessage, setDisplayedMessage] = useState<any>(
    author === 'system' && !oldMessage ? '' : message,
  );
  const displayedMessageRef = useRef(message[0] || '');

  useEffect(() => {
    if (author === 'system' && !oldMessage) {
      const writeMessageInterval = setInterval(() => {
        if (displayedMessageRef.current.length < message.length) {
          scrollToBottom && scrollToBottom();
          displayedMessageRef.current += message[displayedMessageRef.current.length];
          setDisplayedMessage(displayedMessageRef.current);
        } else {
          clearInterval(writeMessageInterval);
          if (!oldMessage && onDone) {
            scrollToBottom && scrollToBottom();
            onDone();
          }
        }
      }, 30);
      return () => clearInterval(writeMessageInterval);
    }
  }, [author, message, oldMessage]);

  let formatedDisplayMessage = displayedMessage.split('\n');
  if (formatedDisplayMessage.length === 1) {
    formatedDisplayMessage = formatedDisplayMessage[0];
  } else {
    formatedDisplayMessage = (
      <>
        {formatedDisplayMessage.map((line, i) => {
          return (
            <>
              <span key={i}>{line}</span>
              <br />
            </>
          );
        })}
      </>
    );
  }

  return (
    <>
      <div className={cn(styles[author], styles.Message)}>{formatedDisplayMessage}</div>
    </>
  );
};

export default Message;

'use client';

import { Avatar, Tabs, TabsProps, Tour, TourProps } from 'antd';
import { FC, useEffect, useMemo, useRef, useState } from 'react';
import styles from './assistant.module.scss';
import TutorialTour from './tours';
import ChatBot from './chatbot';
import cn from 'classnames';

const Assistant: FC = () => {
  const [windowOpen, setWindowOpen] = useState(false);
  const windowRef = useRef(null);

  const [tour, setTour] = useState([]);
  const [tourInProgress, setTourInProgress] = useState(false);

  useEffect(() => {
    if (!document) return;

    const handleClickOutside = (event: any) => {
      if (
        windowOpen &&
        windowRef.current &&
        !(windowRef.current as HTMLElement).contains(event.target)
      ) {
        setWindowOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [windowOpen]);

  const tabItems: TabsProps['items'] = useMemo(
    () => [
      {
        key: '1',
        label: 'Chat-Bot',
        children: <ChatBot />,
      },
      {
        key: '2',
        label: 'Guided Tutorials',
        children: (
          <TutorialTour
            setWindowOpen={setWindowOpen}
            setTourInProgress={setTourInProgress}
            setTour={setTour}
          />
        ),
      },
    ],
    [setWindowOpen],
  );

  return (
    <>
      <div style={{ position: 'relative' }}>
        <Avatar
          style={{ backgroundColor: '#3e93de', cursor: 'pointer' }}
          onClick={(_) => setWindowOpen(!windowOpen)}
        >
          🤖
        </Avatar>
        {windowOpen && (
          <>
            <div className={styles.AssistantWindowOutline}></div>
            <div className={styles.AssistantWindowOverflow}></div>
            <div className={styles.AssistantWindow} ref={windowRef}>
              <div className={cn(styles.innerSpacing, 'Hide-Scroll-Bar')}>
                <Tabs defaultActiveKey="1" items={tabItems} />
                <div></div>
              </div>
            </div>
          </>
        )}
      </div>
      <Tour
        open={tourInProgress}
        onClose={() => {
          setTourInProgress(false);
          setWindowOpen(true);
        }}
        steps={tour as TourProps['steps']}
      />
    </>
  );
};

export default Assistant;

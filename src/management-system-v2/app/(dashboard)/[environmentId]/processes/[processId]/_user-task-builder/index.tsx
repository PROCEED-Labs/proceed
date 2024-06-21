import React, { useEffect, useRef, useState } from 'react';

import styles from './index.module.scss';

import { Modal, Grid, Row as AntRow, Col, Button as AntButton } from 'antd';
import { DesktopOutlined, MobileOutlined } from '@ant-design/icons';

import { Editor, Frame, Element, useEditor, EditorStore } from '@craftjs/core';

import IFrame from 'react-frame-component';

import SubmitButton from './SubmitButton';
import Text from './Text';
import Container from './Container';
import Row from './Row';
import Column from './Column';
import { SettingsPanel, Toolbox } from './Sidebar';
import Header from './Header';
import Input from './Input';
import Table from './Table';

import { toHtml, iframeDocument } from './utils';

import CustomEventhandlers from './CustomCommandhandlers';

type BuilderProps = {
  open: boolean;
  onClose: () => void;
};

const EditorModal: React.FC<BuilderProps> = ({ open, onClose }) => {
  const breakpoint = Grid.useBreakpoint();
  const { query } = useEditor();

  const iframeContainerRef = useRef<HTMLDivElement>(null);

  const [iframeLayout, setIframeLayout] = useState<'computer' | 'mobile'>('computer');
  const [iframeMaxWidth, setIframeMaxWidth] = useState(Infinity);

  useEffect(() => {
    if (open && iframeContainerRef.current) {
      const handleWidth = (width: number) => {
        setIframeMaxWidth(width);
        if (width < 601) setIframeLayout('mobile');
        else setIframeLayout('computer');
      };

      const { width } = iframeContainerRef.current.getBoundingClientRect();
      handleWidth(width);

      const observer = new ResizeObserver((entries) => {
        const { width } = entries[0].contentRect;
        handleWidth(width);
      });

      observer.observe(iframeContainerRef.current);

      () => observer.disconnect();
    }
  }, [open]);

  return (
    <Modal
      width={breakpoint.xs ? '100vw' : '90vw'}
      centered
      styles={{ body: { height: '85vh' } }}
      open={open}
      title="Edit User Task"
      okText="Save"
      onCancel={onClose}
      onOk={() => {
        const json = query.serialize();
        console.log(json);
        console.log(toHtml(json));
      }}
    >
      <div className={styles.BuilderUI}>
        <AntRow className={styles.EditorHeader}>
          <AntButton
            type="text"
            icon={
              <DesktopOutlined
                style={{ color: iframeLayout === 'computer' ? 'blue' : undefined }}
              />
            }
            disabled={iframeMaxWidth < 601}
            onClick={() => setIframeLayout('computer')}
          />
          <AntButton
            type="text"
            icon={
              <MobileOutlined style={{ color: iframeLayout === 'mobile' ? 'blue' : undefined }} />
            }
            onClick={() => setIframeLayout('mobile')}
          />
        </AntRow>
        <AntRow className={styles.EditorBody}>
          <Col span={4}>
            <Toolbox />
          </Col>
          <Col ref={iframeContainerRef} className={styles.HtmlEditor} span={16}>
            <IFrame
              id="user-task-builder-iframe"
              width={iframeLayout === 'computer' || iframeMaxWidth <= 600 ? '100%' : '600px'}
              height="100%"
              style={{ border: 0, margin: 'auto' }}
              initialContent={iframeDocument}
              mountTarget="#mountHere"
            >
              <Frame>
                <Element is={Container} padding={5} background="#fff" borderThickness={0} canvas>
                  <Element is={Row} canvas>
                    <Column>
                      <Text text="Hello World"></Text>
                    </Column>
                  </Element>
                  <Element is={Row} canvas>
                    <Column>
                      <Text text="Hello Universe"></Text>
                    </Column>
                  </Element>
                  <Element is={Row} canvas>
                    <Column>
                      <Text text="ABCDEFG"></Text>
                    </Column>
                  </Element>
                  <Element is={Row} canvas>
                    <Column>
                      <Text text="Test123"></Text>
                    </Column>
                  </Element>
                  <Element is={Row} canvas>
                    <Column>
                      <Text text="Lorem Ipsum"></Text>
                    </Column>
                  </Element>
                  <Element is={Row} canvas>
                    <Column>
                      <Text text="Dolor sit amet"></Text>
                    </Column>
                  </Element>
                </Element>
              </Frame>
            </IFrame>
          </Col>
          <Col span={4}>
            <SettingsPanel />
          </Col>
        </AntRow>
      </div>
    </Modal>
  );
};

const UserTaskBuilder: React.FC<BuilderProps> = ({ open, onClose }) => {
  return (
    <Editor
      resolver={{ Header, Text, SubmitButton, Container, Row, Column, Input, Table }}
      handlers={(store: EditorStore) =>
        new CustomEventhandlers({
          store,
          isMultiSelectEnabled: () => false,
          removeHoverOnMouseleave: true,
        })
      }
    >
      <EditorModal open={open} onClose={onClose} />
    </Editor>
  );
};

export default UserTaskBuilder;

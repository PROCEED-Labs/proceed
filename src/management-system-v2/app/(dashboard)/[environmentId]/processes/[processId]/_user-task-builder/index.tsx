import React, { useCallback, useRef, useState } from 'react';

import styles from './index.module.scss';

import { Modal, Grid, Row as AntRow, Col, Switch } from 'antd';

import {
  Editor,
  Frame,
  Element,
  DefaultEventHandlers,
  NodeId,
  CreateHandlerOptions,
  useEditor,
  Node,
  EditorStore,
} from '@craftjs/core';

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

import { toHtml, iframeDocument, defaultForm } from './utils';

import CustomEventhandlers from './CustomCommandhandlers';

type BuilderProps = {
  open: boolean;
  onClose: () => void;
};

const EditorModal: React.FC<BuilderProps & { onChangeDragVersion: (version: 0 | 1) => void }> = ({
  open,
  onClose,
  onChangeDragVersion,
}) => {
  const breakpoint = Grid.useBreakpoint();
  const { actions, query } = useEditor();

  return (
    <Modal
      width={breakpoint.xs ? '100vw' : '90vw'}
      centered
      styles={{ body: { height: '85vh' } }}
      open={open}
      closeIcon={null}
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Edit User Task</span>
          <Switch onChange={(checked) => onChangeDragVersion(checked ? 1 : 0)} />
        </div>
      }
      okText="Save"
      onCancel={onClose}
      onOk={() => {
        const json = query.serialize();
        console.log(json);
        console.log(toHtml(json));
      }}
    >
      <AntRow className={styles.BuilderUI}>
        <Col span={4}>
          <Toolbox />
        </Col>
        <Col className={styles.HtmlEditor} span={16}>
          <IFrame
            id="user-task-builder-iframe"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            initialContent={iframeDocument}
            mountTarget="#mountHere"
          >
            {/* <Frame data={defaultForm}></Frame> */}
            <Frame>
              <Element is={Container} padding={5} background="#fff" canvas>
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
    </Modal>
  );
};

const UserTaskBuilder: React.FC<BuilderProps> = ({ open, onClose }) => {
  const dragVersionRef = useRef(0);

  const setDragVersion = useCallback((dragVersion: number) => {
    dragVersionRef.current = dragVersion;
  }, []);

  return (
    <Editor
      resolver={{ Header, Text, SubmitButton, Container, Row, Column, Input, Table }}
      handlers={(store: EditorStore) =>
        new CustomEventhandlers(() => dragVersionRef.current, {
          store,
          isMultiSelectEnabled: () => false,
          removeHoverOnMouseleave: true,
        })
      }
    >
      <EditorModal open={open} onClose={onClose} onChangeDragVersion={setDragVersion} />
    </Editor>
  );
};

export default UserTaskBuilder;

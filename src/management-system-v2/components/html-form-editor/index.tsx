import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

import styles from './index.module.scss';

import { Grid, Row as AntRow, Col } from 'antd';

import { Editor, Frame, EditorStore, useEditor, Resolver } from '@craftjs/core';

import IFrame from 'react-frame-component';

import { Toolbar, EditorLayout } from './Toolbar';
import Sidebar from './_sidebar';

import { iframeDocument, toHtml } from './utils';

import CustomEventhandlers from './CustomCommandhandlers';
import useBoundingClientRect from '@/lib/useBoundingClientRect';

import EditorDnDHandler from './DragAndDropHandler';

import ShortcutHandler from './shortcut-handler';
import { ToolboxEntries } from './_sidebar/Toolbox';

import { LuTextCursorInput, LuTable, LuText } from 'react-icons/lu';
import { MdCheckBox, MdRadioButtonChecked, MdTitle, MdOutlineCheck } from 'react-icons/md';
import { RxGroup } from 'react-icons/rx';

import { Element } from '@craftjs/core';

import { defaultElements, exportElements } from './elements';
import useEditorStateStore from './use-editor-state-store';
import Row from './elements/Row';
import Column from './elements/Column';

const { Text, SubmitButton, Table, CheckBoxOrRadioGroup, Input, Container } = defaultElements;

type EditorProps = {
  json?: string;
  onClose?: () => void;
  onChange?: () => void;
  additionalElements?: Resolver;
  additionalExportElements?: Resolver;
  toolboxExtension?: ToolboxEntries;
};

interface EditorContentRef {
  getJson: () => string;
}

export interface HtmlFormEditorRef extends EditorContentRef {
  getHtml: () => string;
}

const EditorContent = forwardRef<EditorContentRef, { json: string; onInit: () => void }>(
  ({ json, onInit }, ref) => {
    const { query, actions } = useEditor();

    useEffect(() => {
      actions.deserialize(json);

      // Check if ROOT is empty, add default elements
      const rootNode = query.node('ROOT').get();
      if (rootNode.data.nodes.length === 0) {
        addDefaultElements(actions, query);
      }

      onInit();
    }, [json]);

    useImperativeHandle(ref, () => ({
      getJson: () => {
        return query.serialize();
      },
    }));

    return <Frame />;
  },
);

EditorContent.displayName = 'EditorContent';

const addDefaultElements = (actions: any, query: any) => {
  const rootNodeId = 'ROOT';

  // Helper function to add element wrapped in Row and Column
  const addElementToRoot = (element: React.ReactElement) => {
    // Create Row
    const rowTree = query.parseReactElement(<Element is={Row} canvas />).toNodeTree();
    actions.addNodeTree(rowTree, rootNodeId);

    // Get the newly created row ID
    const rootNode = query.node(rootNodeId).get();
    const rowId = rootNode.data.nodes[rootNode.data.nodes.length - 1];

    // Create Column inside Row
    const columnTree = query.parseReactElement(<Element is={Column} canvas />).toNodeTree();
    actions.addNodeTree(columnTree, rowId);

    // Get the newly created column ID
    const rowNode = query.node(rowId).get();
    const columnId = rowNode.data.nodes[rowNode.data.nodes.length - 1];

    // Add the actual element inside Column
    const elementTree = query.parseReactElement(element).toNodeTree();
    actions.addNodeTree(elementTree, columnId);
  };

  // Add all meeded elements now
  addElementToRoot(
    <Text text='<h1 class="text-style-heading" dir="ltr"><b><strong class="text-style-bold" style="white-space: pre-wrap;">New Title Element</strong></b></h1>' />,
  );

  addElementToRoot(<Text />);

  addElementToRoot(<Input />);

  addElementToRoot(<SubmitButton />);
};

const HtmlFormEditor = forwardRef<HtmlFormEditorRef, EditorProps>(
  (
    {
      json,
      onClose,
      onChange,
      additionalElements = {},
      additionalExportElements = {},
      toolboxExtension = [],
    },
    ref,
  ) => {
    const breakpoint = Grid.useBreakpoint();

    const content = useRef<EditorContentRef | null>(null);

    const importing = useRef(true);

    useImperativeHandle(ref, () => ({
      getJson: () => {
        return content.current?.getJson() || '';
      },
      getHtml: () => {
        const json = content.current?.getJson();

        if (!json) return '';

        const html = toHtml(json, {
          ...defaultElements,
          ...exportElements,
          ...additionalElements,
          ...additionalExportElements,
        });

        return html;
      },
    }));

    const isMobile = breakpoint.xs;

    const editingEnabled = useEditorStateStore((state) => state.editingEnabled);

    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [iframeMounted, setIframeMounted] = useState(false);
    const [iframeLayout, setIframeLayout] = useState<EditorLayout>('computer');
    const [iframeContainer, setIframeContainer] = useState<HTMLDivElement>();
    const { width: iframeMaxWidth } = useBoundingClientRect(iframeContainer, ['width']);

    useEffect(() => {
      if (iframeMaxWidth < 601) setIframeLayout('mobile');
      else setIframeLayout('computer');
    }, [iframeMaxWidth]);

    const toolbox: ToolboxEntries = [
      {
        title: 'Header',
        icon: <MdTitle />,
        element: (
          <Text text='<h1 class="text-style-heading" dir="ltr"><b><strong class="text-style-bold" style="white-space: pre-wrap;">New Title Element</strong></b></h1>' />
        ),
      },
      {
        title: 'Text',
        icon: <LuText />,
        element: <Text />,
      },
      {
        title: 'Input',
        icon: <LuTextCursorInput />,
        element: <Input />,
      },
      {
        title: 'Radio',
        icon: <MdRadioButtonChecked />,
        element: (
          <CheckBoxOrRadioGroup
            type="radio"
            data={[{ label: 'New Radio Button', value: '', checked: false }]}
          />
        ),
      },
      {
        title: 'Checkbox',
        icon: <MdCheckBox />,
        element: (
          <CheckBoxOrRadioGroup
            type="checkbox"
            data={[{ label: 'New Checkbox', value: '', checked: false }]}
          />
        ),
      },
      {
        title: 'Table',
        icon: <LuTable />,
        element: <Table />,
      },
      {
        title: 'Container',
        icon: <RxGroup />,
        element: <Element is={Container} padding={20} canvas />,
      },
      {
        title: 'Submit',
        icon: <MdOutlineCheck />,
        element: <SubmitButton />,
      },
      ...toolboxExtension,
    ];

    if (!json) return <></>;

    return (
      <>
        <Editor
          resolver={{
            ...defaultElements,
            ...additionalElements,
          }}
          enabled={!isMobile}
          handlers={(store: EditorStore) =>
            new CustomEventhandlers({
              store,
              isMultiSelectEnabled: () => false,
              removeHoverOnMouseleave: true,
            })
          }
          onNodesChange={() => {
            if (onChange && !importing.current) onChange();
          }}
        >
          <EditorDnDHandler
            iframeRef={iframeRef}
            disabled={!iframeMounted || !editingEnabled}
            mobileView={iframeLayout === 'mobile'}
          >
            <div className={styles.EditorUI}>
              {!isMobile && (
                <Toolbar
                  iframeMaxWidth={iframeMaxWidth}
                  iframeLayout={iframeLayout}
                  onLayoutChange={setIframeLayout}
                />
              )}
              <AntRow className={styles.EditorBody}>
                {!isMobile && (
                  <Col style={{ height: '100%', overflow: 'auto' }} span={4}>
                    <Sidebar toolbox={toolbox} />
                  </Col>
                )}
                <Col
                  style={{ border: '2px solid #d3d3d3', borderRadius: '8px' }}
                  ref={(r) => {
                    if (r && r != iframeContainer) {
                      setIframeContainer(r);
                    }
                  }}
                  className={styles.HtmlEditor}
                  span={isMobile ? 24 : 20}
                >
                  <IFrame
                    id="html-form-editor-iframe"
                    ref={iframeRef}
                    width={iframeLayout === 'computer' || iframeMaxWidth <= 600 ? '100%' : '600px'}
                    height="100%"
                    style={{ border: 0, margin: 'auto' }}
                    initialContent={iframeDocument}
                    mountTarget="#mountHere"
                    contentDidMount={() => setIframeMounted(true)}
                  >
                    <ShortcutHandler onClose={onClose} />
                    <EditorContent
                      ref={content}
                      json={json}
                      onInit={() => (importing.current = false)}
                    />
                  </IFrame>
                </Col>
              </AntRow>
            </div>
          </EditorDnDHandler>
        </Editor>
      </>
    );
  },
);

HtmlFormEditor.displayName = 'HtmlFormEditor';

export default HtmlFormEditor;
export { addDefaultElements };

import React, { useEffect, useState } from 'react';

import { Button, ButtonProps, Input, Select } from 'antd';

import { useEditor } from '@craftjs/core';

import styles from './index.module.scss';

const NoFocusButton: React.FC<ButtonProps> = ({ onClick, children, ...props }) => {
  return (
    <Button
      {...props}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick && onClick(e);
      }}
      onMouseDownCapture={(e) => {
        e.preventDefault();
      }}
    >
      {children}
    </Button>
  );
};

export type WithIframeRef<P = unknown> = P & { iframeRef: React.RefObject<HTMLIFrameElement> };

const TextSettings: React.FC<WithIframeRef> = ({ iframeRef }) => {
  const [currentLinkValue, setCurrentLinkValue] = useState<string | undefined>();
  const [linkProtocol, setLinkProtocol] = useState<'http://' | 'https://'>('https://');

  useEffect(() => {
    if (iframeRef.current) {
      const handleTextEdit = (e: Event) => {
        const sel = iframeRef.current?.contentDocument?.getSelection();
        console.log(e, sel);
        if (sel) {
          const range = sel?.getRangeAt(0);

          if (range) {
            let parent: HTMLElement | null;
            const ancestor = range.commonAncestorContainer;
            if (
              ancestor.isSameNode(range.endContainer) &&
              ancestor.isSameNode(range.startContainer)
            )
              parent = range.endContainer.parentElement;
            else parent = range.commonAncestorContainer as HTMLElement;

            if (parent && parent.tagName === 'A') {
              const anchor = parent as HTMLAnchorElement;
              //   const url = anchor.href.match(g);
              const url = /(https?:\/\/)(.*)\//.exec(anchor.href);
              if (url && url.length === 3) {
                setLinkProtocol(url[1] as 'https://' | 'http://');
                setCurrentLinkValue(url[2]);
              } else setCurrentLinkValue(anchor.href);
            } else {
              setCurrentLinkValue(undefined);
            }
          }
        }
      };
      iframeRef.current.contentDocument?.addEventListener('selectionchange', handleTextEdit);
      return () => {
        iframeRef.current?.contentDocument?.removeEventListener('selectionchange', handleTextEdit);
      };
    }
  }, [iframeRef]);

  return (
    <div>
      <NoFocusButton onClick={() => iframeRef.current?.contentDocument?.execCommand('bold')}>
        Bold
      </NoFocusButton>
      <NoFocusButton onClick={() => iframeRef.current?.contentDocument?.execCommand('italic')}>
        Italic
      </NoFocusButton>
      <NoFocusButton
        disabled={typeof currentLinkValue === 'string'}
        onClick={() => setCurrentLinkValue('')}
      >
        Link
      </NoFocusButton>

      <div>
        Link:
        <Input
          disabled={typeof currentLinkValue === 'undefined'}
          addonBefore={
            <Select value={linkProtocol} onChange={(val) => setLinkProtocol(val)}>
              <Select.Option value="http://">http://</Select.Option>
              <Select.Option value="https://">https://</Select.Option>
            </Select>
          }
          value={currentLinkValue}
          // TODO: When pasted with a protocol remove the protocol and set the current protocol to that
          onChange={(e) => setCurrentLinkValue(e.target.value)}
          onPressEnter={() => {
            if (iframeRef.current) {
              const selection = iframeRef.current.contentDocument?.getSelection();

              let range;
              if (selection) {
                range = selection.getRangeAt(0);

                const link = range.startContainer.parentElement;

                if (link && link.tagName === 'A') {
                  const newRange = iframeRef.current.contentDocument?.createRange();

                  if (newRange) {
                    newRange.setStartBefore(link);
                    newRange.setEndAfter(link);
                    selection.removeAllRanges();
                    selection.addRange(newRange);
                  }
                }
              }

              const newLink = (currentLinkValue || '').trim();
              if (newLink) {
                iframeRef.current.contentDocument?.execCommand(
                  'createLink',
                  false,
                  linkProtocol + newLink,
                );
              } else {
                iframeRef.current.contentDocument?.execCommand('unlink');
                setCurrentLinkValue(undefined);
              }

              if (selection && range) {
                let contentEditable = selection.anchorNode as HTMLElement | null;

                while (
                  contentEditable &&
                  (!contentEditable.getAttribute ||
                    contentEditable.getAttribute('contenteditable') !== 'true')
                ) {
                  contentEditable = contentEditable.parentElement;
                }

                if (contentEditable) {
                  contentEditable.focus();
                }

                selection.removeAllRanges();
                selection.addRange(range);
              }
            }
          }}
        />
      </div>
    </div>
  );
};

export const Settings: React.FC<WithIframeRef> = ({ iframeRef }) => {
  const { settings, selectedNodeId, query } = useEditor((state) => {
    const currentColumn = Array.from(state.events.selected)
      .map((id) => state.nodes[id])
      .find((node) => node && node.data.name === 'Column');

    let settings;
    let selectedNodeId;

    if (currentColumn) {
      const childNode = state.nodes[currentColumn.data.nodes[0]];
      settings = childNode.related && childNode.related.settings;
      selectedNodeId = childNode.id;
    }

    return {
      settings,
      selectedNodeId,
    };
  });

  const [isTextEditing, setIsTextEditing] = useState(false);

  useEffect(() => {
    if (iframeRef.current && query) {
      const handleTextEdit = (e: Event) => {
        const selectedElements = query.getEvent('selected').all();

        if (!selectedElements.length) return;

        selectedElements.forEach((id) => {
          const domNode = query.node(id).get().dom;
          if (!domNode) return;
          const editableTextAreas = Array.from(
            domNode.querySelectorAll('[contenteditable="true"]'),
          );

          const selection = iframeRef.current?.contentDocument?.getSelection();
          const isEditing =
            !!selection &&
            !!editableTextAreas.length &&
            editableTextAreas.some((area) => area.contains(selection.anchorNode || null));
          setIsTextEditing(isEditing);
        });
      };
      iframeRef.current.contentDocument?.addEventListener('selectionchange', handleTextEdit);
      return () => {
        iframeRef.current?.contentDocument?.removeEventListener('selectionchange', handleTextEdit);
      };
    }
  }, [iframeRef, query]);

  return (
    <div className={styles.Settings}>
      {isTextEditing ? (
        <TextSettings iframeRef={iframeRef} />
      ) : selectedNodeId ? (
        settings ? (
          <>{React.createElement(settings)}</>
        ) : (
          'No settings available'
        )
      ) : (
        'No element selected'
      )}
    </div>
  );
};

export default Settings;

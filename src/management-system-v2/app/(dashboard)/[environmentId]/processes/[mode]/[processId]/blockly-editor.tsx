'use client';
import React, {
  PropsWithChildren,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from 'react';
import { INITIAL_TOOLBOX_JSON } from './blockly-editor-config';
import * as BlocklyJavaScript from 'blockly/javascript';
const { javascriptGenerator } = BlocklyJavaScript;
import './blockly-editor.css';
import * as Blockly from 'blockly';
import { debounce } from '@/lib/utils';

function validateBlockScript(workspace: Blockly.WorkspaceSvg) {
  const topBlocks = workspace.getTopBlocks();

  const topBlocksWithoutPreviousBlock = topBlocks.filter(
    (block) =>
      block.type !== 'procedures_defreturn' &&
      block.type !== 'procedures_defnoreturn' &&
      block.getPreviousBlock() === null,
  );
  const topBlocksWithoutNextBlock = topBlocks.filter(
    (block) =>
      block.type !== 'procedures_defreturn' &&
      block.type !== 'procedures_defnoreturn' &&
      block.getNextBlock() === null,
  );

  if (topBlocksWithoutPreviousBlock.length <= 1 && topBlocksWithoutNextBlock.length <= 1) {
    return true;
  } else {
    return false;
  }
}

export type BlocklyEditorRefType = {
  getCode: () => { js: string; xml: string };
  fillContainer: () => void;
  reset: () => void;
};

type OnChangeFunc = (isScriptValid: boolean, code: { xml: string; js: string }) => void;
type BlocklyEditorProps = PropsWithChildren<{
  onChange: OnChangeFunc;
  initialXml: string;
  editorRef: React.Ref<BlocklyEditorRefType>;
  readOnly?: boolean;
}>;

const BlocklyEditor = ({
  onChange,
  initialXml,
  editorRef,
  readOnly = false,
}: BlocklyEditorProps) => {
  const blocklyDivRef = useRef<HTMLDivElement | null>(null);
  const blocklyWorkspaceRef = useRef<Blockly.WorkspaceSvg>();
  const blocklyPrevXml = useRef<Element | undefined>();
  const onChangeFunc = useRef<OnChangeFunc | undefined>();

  useEffect(() => {
    onChangeFunc.current = onChange;
  }, [onChange]);

  // useLayoutEffect to make sure this runs before anything else
  useLayoutEffect(() => {
    if (!blocklyDivRef.current) return;

    // Blockly.lib
    const workspace = Blockly.inject(blocklyDivRef.current, {
      grid: {
        spacing: 20,
        length: 3,
        colour: '#ccc',
        snap: true,
      },
      readOnly,
      scrollbars: true,
      toolbox: INITIAL_TOOLBOX_JSON,
    });

    // If readOnly changed: restore previous state
    if (blocklyPrevXml.current) {
      Blockly.Xml.clearWorkspaceAndLoadFromXml(blocklyPrevXml.current, workspace);
    }

    blocklyWorkspaceRef.current = workspace;

    function onChangeHandler() {
      const onChange = onChangeFunc.current;
      if (!onChange) return;

      const isBlockScriptValid = validateBlockScript(workspace);
      const xmlText = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspace));
      const javascriptCode = javascriptGenerator.workspaceToCode(workspace);

      onChange(isBlockScriptValid, { xml: xmlText, js: javascriptCode });
    }

    const debouncedChangeListener = debounce(onChangeHandler, 100);
    workspace.addChangeListener(debouncedChangeListener);

    return () => {
      blocklyPrevXml.current = Blockly.Xml.workspaceToDom(workspace);
      workspace.dispose();
    };
  }, [readOnly]);

  useEffect(() => {
    if (blocklyWorkspaceRef.current && initialXml) {
      if (!blocklyWorkspaceRef.current.rendered) {
        throw new Error(
          'Tried to render xml, but the blockly editor was in headless mode (probably unmounted)',
        );
      }

      const xml = Blockly.utils.xml.textToDom(initialXml);
      Blockly.Xml.clearWorkspaceAndLoadFromXml(xml, blocklyWorkspaceRef.current);
      blocklyWorkspaceRef.current.scrollCenter();
    }
  }, [initialXml]);

  useImperativeHandle(
    editorRef,
    () =>
      ({
        getCode: () => {
          if (blocklyWorkspaceRef.current) {
            const xmlText = Blockly.Xml.domToText(
              Blockly.Xml.workspaceToDom(blocklyWorkspaceRef.current),
            );
            const javascriptCode = javascriptGenerator.workspaceToCode(blocklyWorkspaceRef.current);
            return { xml: xmlText, js: javascriptCode };
          }
          return { xml: '', js: '' };
        },
        fillContainer: () => {
          if (!blocklyWorkspaceRef.current) return;
          // firing this event is easier and more robust than copying blockly's resize logic
          window.dispatchEvent(new Event('resize'));
          blocklyWorkspaceRef.current.scrollCenter();
        },
        reset: () => {
          if (!blocklyWorkspaceRef.current || initialXml === '') return;
          const xml = Blockly.utils.xml.textToDom(initialXml);
          Blockly.Xml.clearWorkspaceAndLoadFromXml(xml, blocklyWorkspaceRef.current);
          blocklyWorkspaceRef.current.scrollCenter();
        },
      }) satisfies BlocklyEditorRefType,
  );

  return (
    <div
      ref={blocklyDivRef}
      style={{
        width: '100%',
        height: '100%',
      }}
    />
  );
};

export default BlocklyEditor;

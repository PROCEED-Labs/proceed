'use client';
import React, {
  PropsWithChildren,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { BlocklyWorkspace } from 'react-blockly';
import { INITIAL_TOOLBOX_JSON, javascriptGenerator, Blockly } from './blockly-editor-config';

import './blockly-editor.css';

export type BlocklyEditorRefType = {
  getCode: () => { js: string; xml: string };
  fillContainer: () => void;
  reset: () => void;
};

type BlocklyEditorProps = PropsWithChildren<{
  onChange: (isScriptValid: boolean, code: { xml: string; js: string }) => void;
  initialXml: string;
  editorRef: React.Ref<BlocklyEditorRefType>;
  blocklyOptions?: Blockly.BlocklyOptions;
}>;

const BlocklyEditor = ({ onChange, initialXml, editorRef, blocklyOptions }: BlocklyEditorProps) => {
  const blocklyEditorRef = useRef<Blockly.WorkspaceSvg | null>(null);

  const validateBlockScript = () => {
    if (blocklyEditorRef.current) {
      const topBlocks = blocklyEditorRef.current.getTopBlocks();

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
      }
    }

    return false;
  };

  useEffect(() => {
    if (blocklyEditorRef.current && blocklyEditorRef.current.rendered && initialXml) {
      const xml = Blockly.utils.xml.textToDom(initialXml);
      Blockly.Xml.clearWorkspaceAndLoadFromXml(xml, blocklyEditorRef.current);
    }
  }, [initialXml]);

  useImperativeHandle(
    editorRef,
    () =>
      ({
        getCode: () => {
          if (blocklyEditorRef.current) {
            const xmlText = Blockly.Xml.domToText(
              Blockly.Xml.workspaceToDom(blocklyEditorRef.current),
            );
            const javascriptCode = javascriptGenerator.workspaceToCode(blocklyEditorRef.current);
            return { xml: xmlText, js: javascriptCode };
          }
          return { xml: '', js: '' };
        },
        fillContainer: () => {
          // firing this event is easier and more robust than copying blockly's resize logic
          window.dispatchEvent(new Event('resize'));
        },
        reset: () => {
          if (!blocklyEditorRef.current) return;

          blocklyEditorRef.current.clear();
          const xmlDom = Blockly.utils.xml.textToDom(initialXml);
          Blockly.Xml.domToWorkspace(xmlDom, blocklyEditorRef.current);
          blocklyEditorRef.current.scrollCenter();
        },
      }) satisfies BlocklyEditorRefType,
  );

  const onWorkspaceChange = useCallback(
    (workspace: Blockly.WorkspaceSvg) => {
      const isBlockScriptValid = validateBlockScript();
      const xmlText = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspace));
      const javascriptCode = javascriptGenerator.workspaceToCode(workspace);

      onChange(isBlockScriptValid, { xml: xmlText, js: javascriptCode });
    },
    [onChange],
  );

  return (
    <BlocklyWorkspace
      className="width-100 fill-height" // you can use whatever classes are appropriate for your app's CSS
      toolboxConfiguration={INITIAL_TOOLBOX_JSON} // this must be a JSON toolbox definition
      workspaceConfiguration={{
        grid: {
          spacing: 20,
          length: 3,
          colour: '#ccc',
          snap: true,
        },
        ...blocklyOptions,
      }}
      onWorkspaceChange={onWorkspaceChange}
      onInject={(newWorkspace) => {
        blocklyEditorRef.current = newWorkspace;
      }}
    />
  );
};

export default BlocklyEditor;

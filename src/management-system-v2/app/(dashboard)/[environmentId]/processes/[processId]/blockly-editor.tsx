'use client';
import React, {
  forwardRef,
  PropsWithChildren,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { BlocklyWorkspace, useBlocklyWorkspace } from 'react-blockly';
import { INITIAL_TOOLBOX_JSON, javascriptGenerator, Blockly } from './blockly-editor-config';

import './blockly-editor.css';

export type BlocklyEditorRefType = { getCode: () => { js: string; xml: string } };

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

  useImperativeHandle(editorRef, () => ({
    getCode: () => {
      if (blocklyEditorRef.current) {
        const xmlText = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(blocklyEditorRef.current));
        const javascriptCode = javascriptGenerator.workspaceToCode(blocklyEditorRef.current);
        return { xml: xmlText, js: javascriptCode };
      }
      return { xml: '', js: '' };
    },
  }));

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
      onWorkspaceChange={(workspace) => {
        const isBlockScriptValid = validateBlockScript();
        const xmlText = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspace));
        const javascriptCode = javascriptGenerator.workspaceToCode(workspace);

        onChange(isBlockScriptValid, { xml: xmlText, js: javascriptCode });
      }}
      onInject={(newWorkspace) => {
        blocklyEditorRef.current = newWorkspace;
      }}
    />
  );
};

export default BlocklyEditor;

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

type OnChangeFunc = (isScriptValid: boolean, code: { xml: string; js: string }) => void;
type BlocklyEditorProps = PropsWithChildren<{
  onChange: OnChangeFunc;
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
      blocklyEditorRef.current.scrollCenter();
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
          if (!blocklyEditorRef.current) return;
          // firing this event is easier and more robust than copying blockly's resize logic
          window.dispatchEvent(new Event('resize'));
          blocklyEditorRef.current.scrollCenter();
        },
        reset: () => {
          if (!blocklyEditorRef.current || initialXml === '') return;
          const xml = Blockly.utils.xml.textToDom(initialXml);
          Blockly.Xml.clearWorkspaceAndLoadFromXml(xml, blocklyEditorRef.current);
          blocklyEditorRef.current.scrollCenter();
        },
      }) satisfies BlocklyEditorRefType,
  );

  // This workaround with the ref is necessary to not cause the props of the BlocklyWorkspace to change
  // as this would call onWorkspaceChange which isn't desired
  // Example:
  // 1. onchange func is memoized with respect to the initialXml prop
  // 2. The initialXml changes
  // 3. The BlocklyWorkspace detects the change of this function and calls it before it has loaded
  // in the new initialXml
  // 4. The onChange function detects differences between the xml in the editor and initialXml and
  // marks a change
  //
  // For this reason we want the function only to be called when there has really been a change in
  // xml in the blockly editor
  const onChangeFunc = useRef<OnChangeFunc | undefined>();
  useEffect(() => {
    onChangeFunc.current = onChange;
  }, [onChange]);
  const onWorkspaceChange = useCallback((workspace: Blockly.WorkspaceSvg) => {
    const isBlockScriptValid = validateBlockScript();
    const xmlText = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspace));
    const javascriptCode = javascriptGenerator.workspaceToCode(workspace);

    onChangeFunc.current?.(isBlockScriptValid, { xml: xmlText, js: javascriptCode });
  }, []);

  useEffect(() => {
    if (!blocklyEditorRef.current || initialXml === '') return;
    const xml = Blockly.utils.xml.textToDom(initialXml);
    Blockly.Xml.clearWorkspaceAndLoadFromXml(xml, blocklyEditorRef.current);
    blocklyEditorRef.current.scrollCenter();
  }, [initialXml]);

  // react blockly doesn't when readOnly changes and it can even lead to issues if the workspace was
  // readonly and changed to editable
  // For this reason, when reaOnly changes, we unmount the BlocklyWorkspace and mount a new one
  return blocklyOptions?.readOnly ? (
    <BlocklyWorkspace
      key="readonly-blockly"
      initialXml={initialXml}
      className="width-100 fill-height" // you can use whatever classes are appropriate for your app's CSS
      toolboxConfiguration={INITIAL_TOOLBOX_JSON} // this must be a JSON toolbox definition
      workspaceConfiguration={{
        grid: {
          spacing: 20,
          length: 3,
          colour: '#ccc',
          snap: true,
        },
        scrollbars: true,
        ...blocklyOptions,
      }}
      onWorkspaceChange={onWorkspaceChange}
      onInject={(newWorkspace) => {
        blocklyEditorRef.current = newWorkspace;
      }}
    />
  ) : (
    <BlocklyWorkspace
      key="editable-blockly"
      initialXml={initialXml}
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

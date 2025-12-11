import { ReactNode, useEffect, useRef, useState } from 'react';
import { Element } from 'bpmn-js/lib/model/Types';
import type { ElementLike } from 'diagram-js/lib/model/Types';
import { Badge, Modal, Button, Space, App, Tabs, TabsProps, Splitter, Alert } from 'antd';
import ScriptEditor, { ScriptEditorRef } from './script-task-editor';
import { useCanEdit } from '@/lib/can-edit-context';
import { Process } from '@/lib/data/process-schema';
import useModelerStateStore from '../use-modeler-state-store';
import { useEnvironment } from '@/components/auth-can';
import { getFolderScriptTasks, getFolderPathScriptTasks } from '@/lib/data/processes';
import styles from './tab-bar-height.module.scss';
import { FolderTree, TreeNode as FolderTreeNode, generateTreeNode } from '@/components/FolderTree';
import { useQuery } from '@tanstack/react-query';
import { isUserErrorResponse } from '@/lib/user-error';
import type { FolderContentWithScriptTasks } from '@/lib/data/db/process';
import { Folder } from '@/lib/data/folder-schema';

function getScriptTaskLabel(element?: Element | ElementLike, knownFileName?: string) {
  if (knownFileName) {
    return knownFileName;
  } else if (
    element &&
    typeof element.businessObject.fileName === 'string' &&
    element.businessObject.fileName.length > 0
  ) {
    return element.businessObject.fileName;
  } else {
    return '< Unnamed >';
  }
}

function folderPathContentsToTreeStructure({
  processId,
  folderContents,
}: {
  folderContents: FolderContentWithScriptTasks[];
  processId: string;
}) {
  const treeStructure: FolderTreeNode<FolderTreeDataType>[] = [];

  let nextParentNode: FolderTreeNode<FolderTreeDataType> | undefined = undefined;

  // The folder content is an array which starts at a folder and goes up to the root (given that
  // the user has permissions for it)
  for (let i = folderContents.length - 1; i >= 0; i--) {
    const folder = folderContents[i];

    let nextFolderId = i > 0 ? folderContents[i - 1].folderId : undefined;

    const parentNodeChildren = nextParentNode?.children ?? treeStructure;
    for (const child of folder.content) {
      const node = generateTreeNode(child);

      // Set the parent for the next folder
      if (child.type === 'folder' && child.id === nextFolderId) {
        node.children = [];
        node.isLeaf = false;
        nextParentNode = node;
      }

      if (child.type === 'process') {
        node.children = child.scriptTasks.map((fileName) =>
          generateTreeNode({
            name: getScriptTaskLabel(undefined, fileName),
            id: `${child.id} ${fileName}`,
            type: 'scriptTask',
          }),
        );
        node.isLeaf = false;
      }

      parentNodeChildren.push(node);
    }
  }

  const pathToProcess = folderContents.map((folderContent) => folderContent.folderId);
  pathToProcess.push(processId);

  return { treeStructure, pathToProcess };
}

type FolderTreeDataType =
  | {
      type: 'process';
      id: string;
      name: string;
      scriptTasks: string[];
    }
  | {
      type: 'folder';
      id: string;
      name: string;
    }
  | {
      type: 'scriptTask';
      id: string;
      name: ReactNode;
      label: string;
      isInThisProcess: boolean;
    };

type ScriptTaskEditorEnvironmentProps = {
  process: Process;
  folder?: Folder;
  selectedElement?: Element;
  close: () => void;
};
export function ScriptTaskEditorEnvironment({
  process,
  folder,
  selectedElement,
  close,
}: ScriptTaskEditorEnvironmentProps) {
  const space = useEnvironment();
  const canEdit = useCanEdit();
  const app = App.useApp();
  const isExecutable = useModelerStateStore((state) => state.isExecutable);

  /* -------------------------------------------------------------------------------------------------
   * Folder Structure for folder tree
   * -----------------------------------------------------------------------------------------------*/
  const [folderTreeState, setFolderTreeState] = useState<FolderTreeNode<FolderTreeDataType>[]>([]);
  const nodeMap = useRef(new Map<React.Key, FolderTreeNode<FolderTreeDataType>>());
  // Keep nodeMap up to date in case the component doesn't control additions to the tree
  useEffect(() => {
    if (!folderTreeState) return;

    nodeMap.current.clear();
    function updateTreeNode(nodes: FolderTreeNode<FolderTreeDataType>[]) {
      for (const node of nodes) {
        nodeMap.current.set(node.element.id, node);

        if (node.children && typeof node.children !== 'function') {
          updateTreeNode(node.children as FolderTreeNode<FolderTreeDataType>[]);
        }
      }
    }
    updateTreeNode(folderTreeState);

    // This would be the case if the process starts out not having any script task
    const processNode = nodeMap.current.get(process.id);
    const folderNode =
      folder && folder.parentId === null ? true : nodeMap.current.get(process.folderId);

    if (folderNode && !processNode) {
      // TODO: this doesn't react to the process changing name
      const processNode = generateTreeNode({
        name: process.name,
        id: process.id,
        type: 'process' as const,
        scriptTasks: [],
      });
      processNode.isLeaf = false;

      nodeMap.current.set(process.id, processNode);

      if (folderNode === true) {
        setFolderTreeState((prev) => [...prev, processNode]);
      } else {
        if (!folderNode.children) folderNode.children = [];
        folderNode.children.push(processNode);
        // rerender
        setFolderTreeState((prev) => [...prev]);
      }
    }
  }, [folderTreeState, process.name, process.id, process.folderId, folder]);

  const { data: treeStructureData } = useQuery({
    queryFn: async () => {
      const result = await getFolderPathScriptTasks(space.spaceId, process.folderId);

      if (isUserErrorResponse(result)) {
        throw result.error;
      }

      return { folderContents: result, processId: process.id };
    },
    select: folderPathContentsToTreeStructure,
    queryKey: ['FolderPathScriptTasks', space.spaceId, process.id, process.folderId],
  });

  useEffect(() => {
    if (treeStructureData?.treeStructure) {
      setFolderTreeState(treeStructureData.treeStructure);
    }
  }, [treeStructureData?.treeStructure]);

  const editorRefs = useRef<Map<string, ScriptEditorRef | null>>(new Map());

  /* -------------------------------------------------------------------------------------------------
   * Script Tasks in process
   * -----------------------------------------------------------------------------------------------*/
  const modeler = useModelerStateStore((state) => state.modeler);
  const modelerEventBus = useModelerStateStore((state) => state.modeler?.getEventBus());
  const [scriptTasksInProcess, setScriptTasksInProcess] = useState<Record<string, ElementLike>>({});
  const [scriptTasksWithChanges, setScriptTasksWithChanges] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!modelerEventBus || !modeler) return;

    function setScriptTasksObj() {
      const obj: Record<string, ElementLike> = {};
      for (const el of modeler!.getAllElements()) {
        if (el.type === 'bpmn:ScriptTask') {
          obj[el.id] = el;
        }
      }
      setScriptTasksInProcess(obj);
    }
    setScriptTasksObj();

    // Update on changes to the modeler
    function changeListener(event: any) {
      const element = event.element as ElementLike;

      if (element.type !== 'bpmn:ScriptTask') return;

      setScriptTasksObj();
    }

    modelerEventBus.on('shape.added', changeListener);
    modelerEventBus.on('shape.removed', changeListener);
    modelerEventBus.on('element.changed', changeListener);

    return () => {
      modelerEventBus.off('shape.added', changeListener);
      modelerEventBus.off('shape.removed', changeListener);
      modelerEventBus.off('element.changed', changeListener);
    };
  }, [modelerEventBus, modeler]);

  // When the component re-renders we make sure that the children of the current processes' node in
  // the folder Tree are up to date.
  // (The component rerenders when script-tasks change due to scriptTasksInProcess.
  const processNode = nodeMap.current.get(process.id);
  if (processNode) {
    processNode.children = [];

    for (const bpmnElement of Object.values(scriptTasksInProcess)) {
      const id = `${process.id} ${bpmnElement.id}`;
      const label = getScriptTaskLabel(bpmnElement);

      let name = label;
      if (scriptTasksWithChanges[id]) {
        name = (
          <span>
            <Badge style={{ marginLeft: 4 }} status="warning" /> {name}
          </span>
        );
      }

      const node = generateTreeNode({
        name,
        label,
        id,
        type: 'scriptTask' as const,
        isInThisProcess: true,
      });
      processNode.children.push(node);
      nodeMap.current.set(id, node);
    }
  }

  /* -------------------------------------------------------------------------------------------------
   * Script Editors
   * -----------------------------------------------------------------------------------------------*/

  // Active script editor holds a string with the following format "{processId} {scriptIdentifier}"
  // The identifier is either a fileName, in the case of script tasks outside of this process, or a
  // bpmn node id in the case of script tasks that are part of this process, we use this id because
  // the fileName can change.
  const [activeScriptEditor, setActiveScriptEditor] = useState<string | undefined>();

  // We use the tabs component from ant design as it makes it easy to hide components and keep their
  // state.
  const [tabItems, setTabItems] = useState<Required<TabsProps>['items']>([]);

  // This effect creates a new tab entry for an edittor in the case that it doesn't exist already.
  useEffect(() => {
    if (selectedElement) {
      const key = `${process.id} ${selectedElement.id}`;
      setTabItems((prev) => {
        if (prev.find((tab) => tab.key === key)) {
          return prev;
        }

        return [
          ...prev,
          scriptTaskTabEntry({ processId: process.id, scriptTaskBpmnElement: selectedElement }),
        ];
      });
      setActiveScriptEditor(key);
    }
  }, [process.id, selectedElement]);

  const activeEditor = activeScriptEditor ? editorRefs.current.get(activeScriptEditor) : undefined;

  async function saveRefListOrAll(_refList?: ScriptEditorRef[]) {
    try {
      let refList: ScriptEditorRef[];
      if (!_refList) {
        refList = [];
        for (const [key, hasChanges] of Object.entries(scriptTasksWithChanges)) {
          if (hasChanges) {
            const editorRef = editorRefs.current.get(key);
            if (!editorRef) throw new Error('Editor without a ref');
            refList.push(editorRef);
          }
        }
      } else {
        refList = _refList;
      }

      const savePromises = await Promise.all(refList.map((ref) => ref.save()));
      const firstErrorMessage = savePromises.find((result) => typeof result === 'string');

      if (firstErrorMessage) {
        app.message.error(firstErrorMessage);
      } else {
        app.message.success('Changes saved');
      }
    } catch (e) {
      console.error('Error while saving script tasks');
      console.error(e);

      return 'Something went wrong';
    }
  }

  async function handleClose() {
    if (!canEdit) {
      return close();
    }

    const withUnsavedChanges = [];
    const withUnsavedChangesRefs: ScriptEditorRef[] = [];
    for (const [key, hasChanges] of Object.entries(scriptTasksWithChanges)) {
      const bpmnElementId = key.split(' ')[1];
      const bpmnElement = scriptTasksInProcess[bpmnElementId];

      if (!bpmnElement) {
        // This should only happen when a script task is removed from the bpmn
        continue;
      }

      if (hasChanges) {
        withUnsavedChanges.push(getScriptTaskLabel(bpmnElement));
        const editorRef = editorRefs.current.get(key);
        if (!editorRef) throw new Error('Editor without a ref');
        withUnsavedChangesRefs.push(editorRef);
      }
    }

    if (withUnsavedChanges.length === 0) {
      return close();
    } else {
      await app.modal.confirm({
        title: 'You have unsaved changes!',
        content: (
          <div>
            Are you sure you want to close without saving? <br />
            The following script tasks have unsaved changes:
            <ul>
              {withUnsavedChanges.map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          </div>
        ),
        onOk: async () => {
          await saveRefListOrAll(withUnsavedChangesRefs);
          close();
        },
        okText: 'Save',
        cancelText: 'Discard',
        onCancel: () => {
          close();
          for (const ref of withUnsavedChangesRefs) {
            ref.reset();
          }
        },
      });
    }
  }

  function scriptTaskTabEntry({
    processId,
    fileName,
    scriptTaskBpmnElement,
  }: {
    processId: string;
    fileName?: string;
    scriptTaskBpmnElement?: ElementLike;
  }) {
    const key = `${processId} ${scriptTaskBpmnElement?.id || fileName}`;

    function onChangeFunction(unsavedValues: boolean) {
      setScriptTasksWithChanges((prevScriptTaskWithCanges) => {
        // don't trigger rerender if nothing changed
        if (prevScriptTaskWithCanges[key] === unsavedValues) return prevScriptTaskWithCanges;

        // This is a bit hacky, but the code above will add a badge to the script name
        // We trigger a rerender here so that the tree will pick up on this change
        setFolderTreeState((prev) => [...prev]);

        return { ...prevScriptTaskWithCanges, [key]: unsavedValues };
      });
    }

    return {
      label: '',
      key,
      children: (
        <ScriptEditor
          key={key}
          processId={processId}
          filename={scriptTaskBpmnElement?.businessObject.fileName || fileName}
          ref={(r) => {
            editorRefs.current.set(key, r);
          }}
          scriptTaskBpmnElement={scriptTaskBpmnElement}
          onChange={scriptTaskBpmnElement ? onChangeFunction : undefined}
        />
      ),
    };
  }

  const currentTreeNode = activeScriptEditor && nodeMap.current.get(activeScriptEditor);

  let title: ReactNode = 'Script Task';

  if (currentTreeNode && currentTreeNode.element.type === 'scriptTask') {
    // Non-editable case
    title = `Script Task: ${currentTreeNode.element.label}`;

    if (currentTreeNode.element.isInThisProcess && canEdit) {
      title = `Edit Script Task: ${currentTreeNode.element.label}`;

      if (!isExecutable) {
        title = (
          <div style={{ display: 'flex' }}>
            {title}{' '}
            <Alert
              style={{ margin: '0 5px' }}
              type="warning"
              message="You cannot edit the script since the process is not executable."
            />
          </div>
        );
      }
    }
  }

  const editingEnabled = canEdit && isExecutable;

  return (
    <Modal
      open={!!selectedElement}
      centered
      width="90vw"
      styles={{ body: { height: '85vh', marginTop: '0.5rem' }, header: { margin: 0 } }}
      title={
        <Space>
          <span style={{ fontSize: '1.5rem' }}>{title}</span>
        </Space>
      }
      onCancel={handleClose}
      footer={
        <Space>
          <Button onClick={handleClose}>Close</Button>

          <Button
            onClick={() => {
              if (activeEditor) {
                saveRefListOrAll([activeEditor]);
              }
            }}
            disabled={
              !editingEnabled ||
              (activeScriptEditor ? scriptTasksWithChanges[activeScriptEditor] !== true : true)
            }
            type="primary"
          >
            Save
          </Button>
          <Button
            onClick={() => saveRefListOrAll()}
            disabled={
              !editingEnabled ||
              Object.values(scriptTasksWithChanges).every((value) => value !== true)
            }
            type="primary"
          >
            Save All
          </Button>
        </Space>
      }
    >
      <Splitter onResize={() => activeEditor?.fillContainer()}>
        <Splitter.Panel defaultSize="20%" min="10%" max="40%">
          <FolderTree<FolderTreeDataType>
            // This makes it so that the folderTree doesn't fetch the root nodes
            rootNodes={[]}
            customGetContent={getFolderScriptTasks}
            treeData={folderTreeState}
            onTreeDataChange={setFolderTreeState}
            expandedKeys={treeStructureData?.pathToProcess}
            newChildrenHook={({ nodes }) => {
              for (const node of nodes) {
                if (node.element.type !== 'process' || node.element.id === process.id) continue;

                node.isLeaf = false;
                node.children = node.element.scriptTasks.map((scriptTaskFileName) =>
                  generateTreeNode({
                    name: scriptTaskFileName,
                    label: scriptTaskFileName,
                    id: `${node.element.id} ${scriptTaskFileName}`,
                    type: 'scriptTask',
                    isInThisProcess: false,
                  }),
                );
              }

              return nodes;
            }}
            onSelect={(treeNode) => {
              if (!treeNode || treeNode.type !== 'scriptTask') return;

              const [processId, fileNameOrElementId] = treeNode.id.split(' ');
              setTabItems((prev) => {
                if (prev.find((tab) => tab.key === treeNode.id)) {
                  return prev;
                }

                return prev.concat(
                  scriptTaskTabEntry({
                    processId,
                    fileName: fileNameOrElementId,
                    scriptTaskBpmnElement: scriptTasksInProcess[fileNameOrElementId],
                  }),
                );
              });

              setActiveScriptEditor(treeNode.id);
            }}
            selectedKeys={activeScriptEditor ? [activeScriptEditor] : undefined}
            treeProps={{ style: { width: 300, overflow: 'hidden' } }}
          />
        </Splitter.Panel>
        <Splitter.Panel style={{ overflow: 'visible' }}>
          <Tabs
            items={tabItems}
            activeKey={activeScriptEditor}
            tabPosition="left"
            className={styles.Tabs}
            onChange={(key) => editorRefs.current.get(key)?.fillContainer()}
            renderTabBar={() => <></>}
          />
        </Splitter.Panel>
      </Splitter>
    </Modal>
  );
}

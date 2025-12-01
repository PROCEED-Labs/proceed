import { useEffect, useMemo, useRef, useState } from 'react';
import { Element } from 'bpmn-js/lib/model/Types';
import type { ElementLike } from 'diagram-js/lib/model/Types';
import { Badge, Modal, Button, Space, App, Menu, MenuProps, Tabs, TabsProps } from 'antd';
import ScriptEditor, { ScriptEditorRef } from './script-task-editor';
import { useCanEdit } from '@/lib/can-edit-context';
import { Process } from '@/lib/data/process-schema';
import useModelerStateStore from '../use-modeler-state-store';
import { useQuery } from '@tanstack/react-query';
import { useEnvironment } from '@/components/auth-can';
import { getEnvironmentScriptTasks } from '@/lib/data/processes';
import { isUserErrorResponse } from '@/lib/user-error';
import styles from './tab-bar-height.module.scss';

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

type ScriptTaskEditorProviderProps = {
  process: Process;
  selectedElement?: Element;
  close: () => void;
};
export function ScriptTaskEditorEnvironment({
  process,
  selectedElement,
  close,
}: ScriptTaskEditorProviderProps) {
  const space = useEnvironment();
  const canEdit = useCanEdit();
  const app = App.useApp();

  const allElements = useModelerStateStore((state) => state.modeler?.getAllElements());
  const scriptTasksInProcess = useMemo(() => {
    return allElements?.filter((el) => el.type === 'bpmn:ScriptTask') || [];
  }, [allElements]);

  const editorRefs = useRef<Map<string, ScriptEditorRef | null>>(new Map());

  const { data: allScriptTasks } = useQuery({
    queryFn: async () => {
      const res = await getEnvironmentScriptTasks(space.spaceId);
      if (isUserErrorResponse(res)) throw res.error;
      return res;
    },
    queryKey: ['allSpaceScriptTasks', space.spaceId],
  });

  const [scriptTasksWithChanges, setScriptTasksWithChanges] = useState<Record<string, boolean>>({});

  const [activeScriptEditor, setActiveScriptEditor] = useState<string | undefined>();
  useEffect(() => {
    if (selectedElement) {
      setActiveScriptEditor(`${process.id} ${selectedElement.id}`);
    }
  }, [process.id, selectedElement]);

  const activeEditor = activeScriptEditor ? editorRefs.current.get(activeScriptEditor) : null;

  async function saveAll(_refList?: ScriptEditorRef[]) {
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
      const bpmnElement = scriptTasksInProcess.find(
        (scriptTask) => scriptTask.id === bpmnElementId,
      );

      if (!bpmnElement)
        throw new Error('Bpmn element in scriptTasksWithChanges not found in scriptTasksInProcess');

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
        onOk: () => saveAll(withUnsavedChangesRefs),
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

  const tabItems = useMemo(() => {
    type TabItems = Required<TabsProps>['items'];
    const tabItems: TabItems = scriptTasksInProcess.map((scriptTaskBpmnElement) => {
      // The key has to be with the bpmn element id, as the fileName could be undefined
      const key = `${process.id} ${scriptTaskBpmnElement.id}`;
      return {
        label: '',
        key,
        children: (
          <ScriptEditor
            key={scriptTaskBpmnElement.id}
            processId={process.id}
            filename={getScriptTaskLabel(undefined, scriptTaskBpmnElement.businessObject.fileName)}
            ref={(r) => {
              editorRefs.current.set(key, r);
            }}
            scriptTaskBpmnElement={scriptTaskBpmnElement}
            onChange={(unsavedValues) => {
              if (scriptTasksWithChanges[key] !== unsavedValues) {
                setScriptTasksWithChanges((prev) => ({ ...prev, [key]: unsavedValues }));
              }
            }}
          />
        ),
      };
    });

    if (!allScriptTasks) return tabItems;

    for (const processWithScriptTasks of allScriptTasks) {
      if (processWithScriptTasks.id === process.id) continue;

      for (const scriptTaskFileName of processWithScriptTasks.scriptTasks) {
        const key = `${processWithScriptTasks.id} ${scriptTaskFileName}`;
        tabItems.push({
          key,
          label: scriptTaskFileName,
          children: (
            <ScriptEditor
              key={`${processWithScriptTasks.id} ${scriptTaskFileName}`}
              processId={processWithScriptTasks.id}
              filename={scriptTaskFileName}
              ref={(r) => {
                editorRefs.current.set(key, r);
              }}
            />
          ),
        });
      }
    }

    return tabItems;
  }, [allScriptTasks, process.id, scriptTasksInProcess, scriptTasksWithChanges]);

  const menuItems = useMemo(() => {
    type MenuItems = Required<MenuProps>['items'];
    const menuItems: MenuItems = [
      {
        key: process.id,
        // TODO: this could change, we should probably get it from some place else
        label: process.name,
        type: 'group',
        children: scriptTasksInProcess.map((scriptTask) => {
          const key = `${process.id} ${scriptTask.id}`;
          return {
            key,
            label: (
              <span>
                {getScriptTaskLabel(scriptTask)}
                {scriptTasksWithChanges[key] && (
                  <Badge style={{ marginLeft: 4 }} status="warning" />
                )}
              </span>
            ),
          };
        }),
      },
    ];

    if (!allScriptTasks) return menuItems;

    for (const processWithScriptTasks of allScriptTasks) {
      if (processWithScriptTasks.id === process.id) continue;

      menuItems.push({
        key: processWithScriptTasks.id,
        label: processWithScriptTasks.name,
        type: 'group',
        children: processWithScriptTasks.scriptTasks.map((scriptTaskFileName) => ({
          key: `${processWithScriptTasks.id} ${scriptTaskFileName}`,
          label: scriptTaskFileName,
        })),
      });
    }

    return menuItems;
  }, [allScriptTasks, process.id, process.name, scriptTasksInProcess, scriptTasksWithChanges]);

  // TODO: change with different script tasks
  const displayFilename = (selectedElement && selectedElement.businessObject.fileName) || undefined;
  let title = canEdit ? 'Edit Script Task' : 'Script Task';
  if (displayFilename) {
    title += `: ${displayFilename}`;
  }

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
            onClick={() => activeEditor?.save()}
            disabled={
              !canEdit ||
              (activeScriptEditor ? scriptTasksWithChanges[activeScriptEditor] !== true : true)
            }
            type="primary"
          >
            Save
          </Button>
          <Button
            onClick={() => {
              for (const [key, ref] of editorRefs.current.entries()) {
                if (scriptTasksWithChanges[key]) {
                  ref?.save();
                }
              }
            }}
            disabled={
              !canEdit || Object.values(scriptTasksWithChanges).every((value) => value !== true)
            }
            type="primary"
          >
            Save All
          </Button>
        </Space>
      }
    >
      <Tabs
        items={tabItems}
        activeKey={activeScriptEditor}
        tabPosition="left"
        className={styles.Tabs}
        onChange={(key) => editorRefs.current.get(key)?.fillContainer()}
        renderTabBar={() => (
          <Menu
            items={menuItems}
            selectedKeys={activeScriptEditor ? [activeScriptEditor] : undefined}
            onSelect={({ key }) => {
              setActiveScriptEditor(key);
              // TODO: find a better way to do this
              setTimeout(() => editorRefs.current.get(key)?.fillContainer(), 0);
            }}
          />
        )}
      />
    </Modal>
  );
}

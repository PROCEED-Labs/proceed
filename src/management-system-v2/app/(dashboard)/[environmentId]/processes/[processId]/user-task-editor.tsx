import HtmlFormEditor, { HtmlFormEditorRef } from '@/components/html-form-editor';
import useEditorStateStore, {
  EditorStoreProvider,
} from '@/components/html-form-editor/use-editor-state-store';
import { App, Grid, Modal } from 'antd';
import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';

import { LuImage, LuMilestone } from 'react-icons/lu';

import { is as bpmnIs } from 'bpmn-js/lib/util/ModelUtil';

import styles from './user-task-editor.module.scss';
import { useCanEdit } from '@/lib/can-edit-context';
import useModelerStateStore from './use-modeler-state-store';

import { Element } from 'diagram-js/lib/model/Types';
import { Element as BpmnElement } from 'bpmn-js/lib/model/Types';
import {
  generateStartFormFileName,
  generateUserTaskFileName,
  getMilestonesFromElement,
  getUserTaskImplementationString,
} from '@proceed/bpmn-helper';
import { getProcessHtmlFormData, saveProcessHtmlForm } from '@/lib/data/processes';
import { useEnvironment } from '@/components/auth-can';
import { defaultForm } from '@/components/html-form-editor/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { wrapServerCall } from '@/lib/wrap-server-call';
import useProcessVariables from './use-process-variables';
import { deepEquals } from '@/lib/helpers/javascriptHelpers';

import { specificElements } from '@/components/html-form-editor/elements';
const { Milestones, ExportMilestones } = specificElements;

import { EditImage, ExportImage } from './user-task-image';

export function canHaveForm(element?: Element) {
  if (!element) return false;
  if (bpmnIs(element, 'bpmn:UserTask')) return true;

  // allow setting the start form of a process when a start element is selected that is not typed
  // (no timer, signal, etc)
  if (!bpmnIs(element, 'bpmn:StartEvent')) return false;
  return !element.businessObject.eventDefinitions?.length;
}

type UserTaskEditorProps = {
  json?: string | null;
  onChange: () => void;
};

const UserTaskEditor = forwardRef<HtmlFormEditorRef, UserTaskEditorProps>(
  ({ json, onChange }, ref) => {
    const modeler = useModelerStateStore((state) => state.modeler);
    const selectedElementId = useModelerStateStore((state) => state.selectedElementId);

    const {
      variables: processVariables,
      addVariable: addProcessVariable,
      updateVariable: updateProcessVariable,
    } = useProcessVariables();

    const { variables, updateVariables, updateMilestones } = useEditorStateStore((state) => state);

    useEffect(() => {
      // initialize the variables known to the editor when it is opened
      if (json) updateVariables([...processVariables]);
    }, [json]);

    useEffect(() => {
      if (variables) {
        // apply variables changes made in the editor to the process
        variables.forEach((variable) => {
          const oldVariable = processVariables.find((pV) => pV.name === variable.name);

          if (!oldVariable) {
            addProcessVariable(variable);
          } else if (!deepEquals(variable, oldVariable)) {
            updateProcessVariable(variable, oldVariable);
          }
        });
      }
    }, [variables]);

    useEffect(() => {
      if (selectedElementId && modeler) {
        // (re-) initialize the milestones known to the editor when it is opened
        const selectedElement = modeler.getElement(selectedElementId);

        if (selectedElement)
          updateMilestones(getMilestonesFromElement(selectedElement.businessObject));
      }
    }, []);

    return (
      <>
        {json && (
          <HtmlFormEditor
            ref={ref}
            json={json}
            additionalElements={{ Milestones, Image: EditImage }}
            additionalExportElements={{ Milestones: ExportMilestones, Image: ExportImage }}
            toolboxExtension={[
              {
                title: 'Milestones',
                icon: <LuMilestone />,
                element: <Milestones />,
              },
              {
                title: 'Image',
                icon: <LuImage />,
                element: <EditImage />,
              },
            ]}
            onChange={onChange}
          />
        )}
      </>
    );
  },
);

type UserTaskEditorModalProps = {
  processId: string;
  open: boolean;
  onClose: () => void;
};

const UserTaskEditorModal: React.FC<UserTaskEditorModalProps> = ({ processId, open, onClose }) => {
  const builder = useRef<HtmlFormEditorRef | null>(null);

  const environment = useEnvironment();
  const editingEnabled = useCanEdit();

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const app = App.useApp();
  const breakpoint = Grid.useBreakpoint();

  const isMobile = breakpoint.xs;

  const modeler = useModelerStateStore((state) => state.modeler);
  const selectedElementId = useModelerStateStore((state) => state.selectedElementId);

  const selectedElement = modeler && selectedElementId && modeler.getElement(selectedElementId);

  const affectedElement = useMemo(() => {
    if (modeler && selectedElement && canHaveForm(selectedElement)) {
      if (bpmnIs(selectedElement, 'bpmn:UserTask')) {
        return selectedElement;
      } else if (bpmnIs(selectedElement, 'bpmn:StartEvent')) {
        let element: Element | undefined = selectedElement;
        while (element) {
          if (bpmnIs(element, 'bpmn:Process')) return element;
          element = element.parent;
        }
      }
    }

    return undefined;
  }, [modeler, selectedElement]);

  const filename = useMemo(() => {
    if (affectedElement) {
      if (bpmnIs(affectedElement, 'bpmn:UserTask')) {
        return affectedElement.businessObject.fileName || generateUserTaskFileName();
      } else if (bpmnIs(affectedElement, 'bpmn:Process')) {
        return (
          affectedElement.businessObject.uiForNontypedStartEventsFileName ||
          generateStartFormFileName()
        );
      }
    }

    return undefined;
  }, [affectedElement]);

  const queryClient = useQueryClient();

  const handleSave = async () => {
    const json = builder.current?.getJson();
    const html = builder.current?.getHtml();

    if (json && html && modeler && affectedElement) {
      let fileNameAttribute = '';
      let additionalChanges = {};

      if (bpmnIs(affectedElement, 'bpmn:UserTask')) {
        fileNameAttribute = 'fileName';
        additionalChanges = { implementation: getUserTaskImplementationString() };
      } else if (bpmnIs(affectedElement, 'bpmn:Process')) {
        fileNameAttribute = 'uiForNontypedStartEventsFileName';
      }

      if (fileNameAttribute) {
        await wrapServerCall({
          fn: async () => {
            const res = await saveProcessHtmlForm(
              processId,
              filename!,
              json,
              html,
              environment.spaceId,
            );
            return res;
          },
          onSuccess: () => {
            app.message.success('Form saved');
            queryClient.invalidateQueries({
              queryKey: ['html-form-json', processId, filename],
            });

            if (filename !== affectedElement.businessObject[fileNameAttribute]) {
              modeler.getModeling().updateProperties(affectedElement as BpmnElement, {
                [fileNameAttribute]: filename,
                ...additionalChanges,
              });
            }

            setHasUnsavedChanges(false);
            onClose();
          },
          app,
        });
      }
    }
  };

  const [modalApi, modalElement] = Modal.useModal();

  const handleClose = () => {
    if (!hasUnsavedChanges) {
      onClose();
    } else {
      modalApi.confirm({
        title: 'You have unsaved changes!',
        content: 'Are you sure you want to close without saving?',
        onOk: () => {
          setHasUnsavedChanges(false);
          onClose();
        },
      });
    }
  };

  const { data: json } = useQuery({
    queryFn: async () => {
      if (!processId || !filename) return null;
      const res = await wrapServerCall({
        fn: async () => {
          const json = await getProcessHtmlFormData(processId, filename, environment.spaceId);

          return json || defaultForm;
        },
        onSuccess: false,
      });

      return res || null;
    },
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: ['html-form-json', processId, filename],
    enabled: open,
  });

  let title = 'Edit Form';

  if (bpmnIs(affectedElement, 'bpmn:UserTask')) {
    title = 'Edit User Task Form';
  } else if (bpmnIs(affectedElement, 'bpmn:Process')) {
    title = 'Edit Process Start Form';
  }

  return (
    <Modal
      className={styles.EditorModal}
      centered
      width={isMobile ? '100vw' : '90vw'}
      styles={{ body: { height: '85vh' } }}
      open={open}
      title={title}
      okText="Save"
      cancelText={hasUnsavedChanges ? 'Cancel' : 'Close'}
      onCancel={handleClose}
      okButtonProps={{ disabled: !editingEnabled }}
      onOk={handleSave}
      destroyOnClose
    >
      <EditorStoreProvider>
        <UserTaskEditor json={json} onChange={() => setHasUnsavedChanges(true)} ref={builder} />
      </EditorStoreProvider>
      {modalElement}
    </Modal>
  );
};

export default UserTaskEditorModal;

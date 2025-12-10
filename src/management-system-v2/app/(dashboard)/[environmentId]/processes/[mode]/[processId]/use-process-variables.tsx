import { useEffect, useState } from 'react';

import {
  deepCopyElementById,
  getVariablesFromElement,
  setProceedElement,
} from '@proceed/bpmn-helper';

import { ElementLike } from 'diagram-js/lib/model/Types';
import { is as bpmnIs } from 'bpmn-js/lib/util/ModelUtil';

import useModelerStateStore from './use-modeler-state-store';
import { ProcessVariable, ProcessVariableSchema } from '@/lib/process-variable-schema';

export default function useProcessVariables() {
  const [variables, setVariables] = useState<ProcessVariable[]>([]);
  const [processElement, setProcessElement] = useState<ElementLike | undefined>(undefined);

  const modeler = useModelerStateStore((state) => state.modeler);

  useEffect(() => {
    if (modeler) {
      const elements = modeler.getAllElements();
      const processEl = elements.find((el) => bpmnIs(el, 'bpmn:Process'));

      if (processEl) {
        setProcessElement(processEl);
        const variables = ProcessVariableSchema.array().safeParse(
          getVariablesFromElement(processEl.businessObject),
        );
        if (variables.success) setVariables(variables.data);
        // TODO: maybe handle failure as well

        // watch for updates in the bpmn and mirror them in this components state
        const onUpdate = (event: any) => {
          if (!event.context) return;
          const { context } = event;

          if (context.element.id === processEl.id) {
            const variables = getVariablesFromElement(context.element.businessObject);
            setVariables(variables as ProcessVariable[]);
          }
        };

        const eventBus = modeler.getEventBus();
        eventBus.on('commandStack.element.updateProperties.postExecuted', onUpdate);

        return () => {
          setProcessElement(undefined);
          setVariables([]);
          eventBus.off('commandStack.element.updateProperties.postExecuted', onUpdate);
        };
      }
    }
  }, [modeler]);

  const updateVariable = async (variable?: ProcessVariable, originalVariableName?: string) => {
    if (!processElement) return;

    // update the data in the bpmn
    const modeling = modeler!.getModeling();
    const bpmn = await modeler!.getXML();
    const selectedElementCopy = (await deepCopyElementById(bpmn!, processElement.id)) as any;

    if (originalVariableName && originalVariableName !== variable?.name) {
      setProceedElement(selectedElementCopy, 'Variable', null, {
        name: originalVariableName,
      });
    }

    if (variable) {
      setProceedElement(selectedElementCopy, 'Variable', undefined, variable);
    }

    modeling.updateProperties(processElement as any, {
      extensionElements: selectedElementCopy.extensionElements,
    });
  };

  return {
    variables,
    removeVariable: (variableName: string) => updateVariable(undefined, variableName),
    addVariable: (variable: ProcessVariable) => updateVariable(variable),
    updateVariable: (variable: ProcessVariable, originalVariable: ProcessVariable) =>
      updateVariable(variable, originalVariable.name),
  };
}

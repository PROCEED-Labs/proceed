import { useEffect, useState } from 'react';

import {
  deepCopyElementById,
  getVariablesFromElement,
  setProceedElement,
} from '@proceed/bpmn-helper';

import { ElementLike } from 'diagram-js/lib/model/Types';
import { is as bpmnIs } from 'bpmn-js/lib/util/ModelUtil';

import useModelerStateStore from './use-modeler-state-store';

export type ProcessVariable = ReturnType<typeof getVariablesFromElement>[number];

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
        setVariables(getVariablesFromElement(processEl.businessObject));
      }
    }
    return () => {
      setProcessElement(undefined);
      setVariables([]);
    };
  }, [modeler]);

  const addOrEditVariable = async (
    variable: ProcessVariable,
    originalVariable?: ProcessVariable,
  ) => {
    if (!processElement) return;

    // update the data in the component
    let originalIndex = -1;
    if (originalVariable) {
      originalIndex = variables.findIndex((v) => v.name === originalVariable.name);
    }
    if (originalIndex < 0) {
      // add the new variable to the end of the list
      setVariables([...variables, variable]);
    } else {
      // replace the old data
      setVariables([
        ...variables.slice(0, originalIndex),
        variable,
        ...variables.slice(originalIndex + 1),
      ]);
    }

    // update the data in the bpmn
    const modeling = modeler!.getModeling();
    const bpmn = await modeler!.getXML();
    const selectedElementCopy = (await deepCopyElementById(bpmn!, processElement.id)) as any;
    if (originalVariable && originalVariable.name !== variable.name) {
      // remove the old variable entry if the name of an existing variable has been changed
      // setProceedElement can only identify changes when the name is the same
      setProceedElement(selectedElementCopy, 'Variable', null, {
        name: originalVariable.name,
      });
    }
    setProceedElement(selectedElementCopy, 'Variable', undefined, variable);
    modeling.updateProperties(processElement as any, {
      extensionElements: selectedElementCopy.extensionElements,
    });
  };

  const removeVariable = async (variableName: string) => {
    if (processElement) {
      // remove from this components data
      setVariables(variables.filter((v) => v.name !== variableName));

      // remove from the bpmn
      const modeling = modeler!.getModeling();
      const bpmn = await modeler!.getXML();
      const selectedElementCopy = (await deepCopyElementById(bpmn!, processElement.id)) as any;
      setProceedElement(selectedElementCopy, 'Variable', null, {
        name: variableName,
      });
      modeling.updateProperties(processElement as any, {
        extensionElements: selectedElementCopy.extensionElements,
      });
    }
  };

  return {
    variables,
    removeVariable,
    addVariable: (variable: ProcessVariable) => addOrEditVariable(variable),
    updateVariable: (variable: ProcessVariable, originalVariable: ProcessVariable) =>
      addOrEditVariable(variable, originalVariable),
  };
}

import type { Editor as ToastEditorType } from '@toast-ui/editor';

import { isAny, is as isType } from 'bpmn-js/lib/util/ModelUtil';

import { getMetaDataFromElement, getMilestonesFromElement } from '@proceed/bpmn-helper';

// generate the title of an elements section based on the type of the element
export function getTitle(el: any) {
  let name = el.name || `<${el.id}>`;

  if (isAny(el, ['bpmn:Collaboration', 'bpmn:Process'])) {
    return 'Process Diagram';
  } else if (isType(el, 'bpmn:Participant')) {
    return 'Pool: ' + name;
  } else if (isType(el, 'bpmn:SubProcess')) {
    return 'Subprocess: ' + name;
  } else if (isType(el, 'bpmn:CallActivity')) {
    return 'Call Activity: ' + name;
  }
}

/**
 * Returns the meta data to show in the (sub-)chapter of an element
 *
 * @param el the moddle object representing the element
 * @param mdEditor an instance of the toast markdown editor
 */
export function getMetaDataFromBpmnElement(el: any, mdEditor: ToastEditorType) {
  const meta = getMetaDataFromElement(el);

  function getHtmlFromMarkdown(markdown: string) {
    mdEditor.setMarkdown(markdown);
    return mdEditor.getHTML();
  }

  const milestones = getMilestonesFromElement(el).map(({ id, name, description }) => {
    if (description) {
      description = getHtmlFromMarkdown(description);
    }

    return { id, name, description };
  });

  let description: string | undefined = undefined;
  const documentation = el.documentation?.find((el: any) => el.text)?.text;
  if (documentation) {
    description = getHtmlFromMarkdown(documentation);
  }

  return {
    description,
    meta: Object.keys(meta).length ? meta : undefined,
    milestones: milestones.length ? milestones : undefined,
  };
}

/**
 * Returns the elements contained by an element that should also be displayed on the documentation page
 *
 * @param el the element that possibly contains other elements
 */
export function getChildElements(el: any) {
  if (isType(el, 'bpmn:Collaboration')) {
    return el.participants || [];
  } else if (isType(el, 'bpmn:Participant')) {
    if (el.processRef.flowElements) {
      return el.processRef.flowElements.filter((el: any) => !isType(el, 'bpmn:SequenceFlow'));
    }
  } else {
    if (el.flowElements) {
      return el.flowElements.filter((el: any) => !isType(el, 'bpmn:SequenceFlow'));
    }
  }

  return [];
}

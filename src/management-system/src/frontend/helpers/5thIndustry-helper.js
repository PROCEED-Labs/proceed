export function getEnclosingProcess(element) {
  while (element.parent && element.type !== 'bpmn:Process') {
    element = element.parent;
  }

  if (element) {
    return element;
  }

  return undefined;
}

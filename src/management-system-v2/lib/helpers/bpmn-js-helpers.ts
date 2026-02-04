import { getFillColor, getStrokeColor, getLabelColor } from 'bpmn-js/lib/draw/BpmnRenderUtil';

import { Shape } from 'bpmn-js/lib/model/Types';

export function getTextColor(shape: Shape) {
  return shape?.di?.label?.color || getLabelColor(shape);
}

export function getBackgroundColor(shape: Shape) {
  return getFillColor(shape, '#FFFFFFFF');
}

export function getBorderColor(shape: Shape) {
  return shape?.di?.['border-color'] || getStrokeColor(shape);
}

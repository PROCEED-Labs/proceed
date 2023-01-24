// This implementation is following the advice in https://github.com/bpmn-io/bpmn-js-example-custom-rendering

const HIGH_PRIORITY = 1500;

import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer';

import { translate } from 'diagram-js/lib/util/SvgTransformUtil';

import { append as svgAppend, classes as svgClasses } from 'tiny-svg';

import { getStrokeColor } from 'bpmn-js/lib/draw/BpmnRenderUtil';

import { is } from 'bpmn-js/lib/util/ModelUtil';

class PlaceholderRenderer extends BaseRenderer {
  constructor(eventBus, bpmnRenderer, textRenderer, config) {
    super(eventBus, HIGH_PRIORITY);

    this.bpmnRenderer = bpmnRenderer;
    this.textRenderer = textRenderer;
    this.config = config;
  }

  canRender(element) {
    return is(element, ['bpmn:Task']) && element.businessObject.placeholder;
  }

  drawShape(parentNode, element, attrs) {
    const shape = this.bpmnRenderer.drawShape(parentNode, element, attrs);

    if (is(element, 'bpmn:Task') && element.businessObject.placeholder) {
      const label = this.renderLabel(parentNode, element, '?');

      translate(label, -(element.width / 2 - 13), -(element.height / 2 - 13));
    }

    return shape;
  }

  // The following function were adapted from https://github.com/bpmn-io/bpmn-js/blob/75b48a37b53eba7246b320bdcfe2a1b083c28e1f/lib/draw/BpmnRenderer.js

  renderLabel(parentGfx, element, label) {
    const options = {
      box: element,
      align: 'center-middle',
      fontWeight: 'bold',
      style: {
        fill: getStrokeColor(element, this.config.defaultStrokeColor),
        fontSize: 22,
      },
    };

    var text = this.textRenderer.createText(label, options);

    svgClasses(text).add('djs-label');
    svgAppend(parentGfx, text);

    return text;
  }
}
PlaceholderRenderer.$inject = ['eventBus', 'bpmnRenderer', 'textRenderer', 'config'];

export default {
  __init__: ['placeholderRenderer'],
  placeholderRenderer: ['type', PlaceholderRenderer],
};

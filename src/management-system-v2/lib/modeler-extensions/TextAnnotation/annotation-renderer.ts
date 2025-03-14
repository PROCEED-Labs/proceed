import BaseRenderer, { Element } from 'diagram-js/lib/draw/BaseRenderer';

import { Shape } from 'bpmn-js/lib/model/Types';
import EventBus from 'diagram-js/lib/core/EventBus';
import TextRenderer from 'bpmn-js/lib/draw/TextRenderer';

import { is } from 'bpmn-js/lib/util/ModelUtil';

import { getBounds, getSemantic } from 'bpmn-js/lib/draw/BpmnRenderUtil';

import { append as svgAppend, create as svgCreate, classes as svgClasses } from 'tiny-svg';
import { getBackgroundColor, getBorderColor, getTextColor } from '@/lib/helpers/bpmn-js-helpers';

const HIGH_PRIORITY = 3000;

export default class CustomAnnotationRenderer extends BaseRenderer {
  textRenderer: TextRenderer;
  styles: any;

  // this tells bpmn-js which modules need to be passed to the constructor (the order must be the
  // same as in the constructor!!)
  static $inject: string[] = ['eventBus', 'styles', 'textRenderer'];

  constructor(eventBus: EventBus, styles: any, textRenderer: TextRenderer) {
    super(eventBus, HIGH_PRIORITY);

    this.styles = styles;
    this.textRenderer = textRenderer;
  }

  canRender(element: Element): boolean {
    // tell bpmn-js to render text annotations elements with this module
    return is(element, 'bpmn:TextAnnotation');
  }

  drawShape(
    parentGfx: SVGElement,
    shape: Shape,
    attrs: { fill?: string; stroke?: string; width?: string; height?: string } = {},
  ): SVGElement {
    const { width, height } = getBounds(shape, attrs);

    var containerElement = svgCreate('rect', {
      width,
      height,
      style: `fill: ${getBackgroundColor(shape)}; stroke: ${getBorderColor(shape)}; stroke-width: 1px; filter: drop-shadow(2px 5px 4px #6a6a6a);`,
    });
    svgAppend(parentGfx, containerElement);

    const semantic = getSemantic(shape);
    const text = semantic.get('text') || '';

    var textElement = this.textRenderer.createText(text, {
      align: 'left-top' as any,
      box: getBounds(shape, attrs),
      padding: 7,
      style: {
        fill: getTextColor(shape),
      },
    });

    svgClasses(textElement).add('djs-label');

    svgAppend(parentGfx, textElement);

    return containerElement;
  }
}

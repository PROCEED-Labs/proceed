import BaseRenderer, { Element } from 'diagram-js/lib/draw/BaseRenderer';

import { Shape } from 'bpmn-js/lib/model/Types';
import EventBus from 'diagram-js/lib/core/EventBus';
import BpmnRenderer from 'bpmn-js/lib/draw/BpmnRenderer';
import TextRenderer from 'bpmn-js/lib/draw/TextRenderer';

import { is } from 'bpmn-js/lib/util/ModelUtil';

import {
  black,
  getFillColor,
  getLabelColor,
  getStrokeColor,
} from 'bpmn-js/lib/draw/BpmnRenderUtil';
import PathMap from 'bpmn-js/lib/draw/PathMap';

import { append as svgAppend, create as svgCreate, classes as svgClasses } from 'tiny-svg';

import iconPaths from './iconPaths';
import { isLabel } from 'bpmn-js/lib/util/LabelUtil';
import { getTextColor } from '@/lib/helpers/bpmn-js-helpers';

const HIGH_PRIORITY = 3000;

/**
 * This module is responsible for rendering our custom resource elements
 **/
export default class ResourceRenderer extends BaseRenderer {
  bpmnRenderer: BpmnRenderer;
  textRenderer: TextRenderer;
  styles: any;
  pathMap: PathMap;
  config: any;

  // this tells bpmn-js which modules need to be passed to the constructor (the order must be the
  // same as in the constructor!!)
  static $inject: string[] = [
    'eventBus',
    'pathMap',
    'styles',
    'bpmnRenderer',
    'textRenderer',
    'config',
  ];

  constructor(
    eventBus: EventBus,
    pathMap: PathMap,
    styles: any,
    bpmnRenderer: BpmnRenderer,
    textRenderer: TextRenderer,
    config: any,
  ) {
    super(eventBus, HIGH_PRIORITY);

    this.pathMap = pathMap;
    this.styles = styles;
    this.bpmnRenderer = bpmnRenderer;
    this.textRenderer = textRenderer;
    this.config = config;
  }

  canRender(element: Element): boolean {
    // tell bpmn-js to render resource elements with this module
    return is(element, 'proceed:GenericResource');
  }

  drawShape(
    parentGfx: SVGElement,
    shape: Shape,
    attrs: { fill?: string; stroke?: string } = {},
  ): SVGElement {
    if (isLabel(shape)) {
      let box;
      // recreating the label rendering since the default one does not work for labels on our custom
      // elements
      // this is yanked from the default bpmn renderer to circumvent some default logic that cannot handle labels for our custom elements
      // https://github.com/bpmn-io/bpmn-js/blob/develop/lib/draw/BpmnRenderer.js (see the renderExternalLabel and renderLabel functions)
      box = {
        width: 90,
        height: 30,
        x: shape.width / 2 + shape.x,
        y: shape.height / 2 + shape.y,
      };
      const textAttrs = {
        box,
        fitBox: true,
        size: { width: 100 },
        style: {
          ...this.textRenderer.getExternalStyle(),
          fill: getTextColor(shape),
        },
      };
      const text = this.textRenderer.createText(shape.businessObject.name || '', textAttrs);

      svgClasses(text).add('djs-label');
      svgAppend(parentGfx, text);

      return text;
    }

    const draw = (path: string) => {
      return this.drawPath(parentGfx, path, {
        fill: getFillColor(shape, this.config && this.config.defaultFillColor, attrs.fill),
        stroke: getStrokeColor(shape, this.config && this.config.defaultStrokeColor, attrs.stroke),
        strokeWidth: 0.035,
        transform: `translate(${shape.width / 2}, ${shape.height / 2}) scale(${shape.height})`,
      });
    };
    switch (shape.businessObject.resourceType) {
      case 'User':
        return draw(iconPaths.person);
      case 'Robot':
        return draw(iconPaths.robot);
      case 'Screen':
        return draw(iconPaths.screen);
      case 'Laptop':
        return draw(iconPaths.laptop);
      case 'Server':
        return draw(iconPaths.server);
      default:
        throw new Error('Cannot draw unknown resource type');
    }
  }

  lineStyle(attrs = {}) {
    return this.styles.computeStyle(attrs, ['no-fill'], {
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      stroke: black,
      strokeWidth: 2,
    });
  }

  drawPath(parentGfx: SVGElement, d: any, attrs = {}) {
    attrs = this.lineStyle(attrs);

    var path = svgCreate('path', {
      ...attrs,
      d,
    });

    svgAppend(parentGfx, path);

    return path;
  }
}

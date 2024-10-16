import BaseRenderer, { Element } from 'diagram-js/lib/draw/BaseRenderer';

import { translate } from 'diagram-js/lib/util/SvgTransformUtil';

import { Shape } from 'bpmn-js/lib/model/Types';
import EventBus from 'diagram-js/lib/core/EventBus';
import BpmnRenderer from 'bpmn-js/lib/draw/BpmnRenderer';
import TextRenderer from 'bpmn-js/lib/draw/TextRenderer';

import { is, isAny } from 'bpmn-js/lib/util/ModelUtil';
import { black, getFillColor, getStrokeColor } from 'bpmn-js/lib/draw/BpmnRenderUtil';
import PathMap from 'bpmn-js/lib/draw/PathMap';

import { append as svgAppend, create as svgCreate } from 'tiny-svg';

const HIGH_PRIORITY = 1500;

export default class ResourceRenderer extends BaseRenderer {
  bpmnRenderer: BpmnRenderer;
  styles: any;
  pathMap: PathMap;
  config: any;

  // this tells bpmn-js which modules need to be passed to the constructor (the order must be the
  // same as in the constructor!!)
  static $inject: string[] = ['eventBus', 'pathMap', 'styles', 'bpmnRenderer', 'config'];

  constructor(
    eventBus: EventBus,
    pathMap: PathMap,
    styles: any,
    bpmnRenderer: BpmnRenderer,
    config: any,
  ) {
    super(eventBus, HIGH_PRIORITY);

    this.pathMap = pathMap;
    this.styles = styles;
    this.bpmnRenderer = bpmnRenderer;
    this.config = config;
  }

  canRender(element: Element): boolean {
    return (
      isAny(element, ['proceed:HumanPerformer', 'proceed:MachinePerformer']) && !element.labelTarget
    );
  }

  drawShape(parentGfx: SVGElement, shape: Shape, attrs = {}): SVGElement {
    const pathDataUser1 = this.pathMap.getScaledPath('TASK_TYPE_USER_1', {
      xScaleFactor: 1,
      yScaleFactor: 1,
      containerWidth: shape.width,
      containerHeight: shape.height,
      abspos: {
        x: shape.width / 2,
        y: shape.height / 2,
      },
    });

    this.drawPath(parentGfx, pathDataUser1, {
      fill: getFillColor(shape, this.config && this.config.defaultFillColor, attrs.fill),
      stroke: getStrokeColor(shape, this.config && this.config.defaultStrokeColor, attrs.stroke),
      strokeWidth: 0.5,
    });

    const pathDataUser2 = this.pathMap.getScaledPath('TASK_TYPE_USER_2', {
      xScaleFactor: 1,
      yScaleFactor: 1,
      containerWidth: shape.width,
      containerHeight: shape.height,
      abspos: {
        x: shape.width / 2,
        y: shape.height / 2,
      },
    });

    this.drawPath(parentGfx, pathDataUser2, {
      fill: getFillColor(shape, this.config && this.config.defaultFillColor, attrs.fill),
      stroke: getStrokeColor(shape, this.config && this.config.defaultStrokeColor, attrs.stroke),
      strokeWidth: 0.5,
    });

    const pathDataUser3 = this.pathMap.getScaledPath('TASK_TYPE_USER_3', {
      xScaleFactor: 1,
      yScaleFactor: 1,
      containerWidth: shape.width,
      containerHeight: shape.height,
      abspos: {
        x: shape.width / 2,
        y: shape.height / 2,
      },
    });

    return this.drawPath(parentGfx, pathDataUser3, {
      fill: getFillColor(shape, this.config && this.config.defaultFillColor, black),
      stroke: getStrokeColor(shape, this.config && this.config.defaultStrokeColor, attrs.stroke),
      strokeWidth: 0.5,
    });
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

import Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import EventBus, { EventBusEventCallback } from 'diagram-js/lib/core/EventBus';
import Canvas from 'diagram-js/lib/core/Canvas';
import ElementRegistry from 'diagram-js/lib/core/ElementRegistry';
import { Shape } from 'bpmn-js/lib/model/Types';

import { isLabel } from 'bpmn-js/lib/util/LabelUtil';
import { is } from 'bpmn-js/lib/util/ModelUtil';
import TextRenderer from 'bpmn-js/lib/draw/TextRenderer';

export default class ResourceLabelEditingProvider {
  static $inject = [
    'eventBus',
    'modeling',
    'elementRegistry',
    'directEditing',
    'canvas',
    'textRenderer',
  ];

  canvas: Canvas;
  textRenderer: TextRenderer;
  modeling: Modeling;

  constructor(
    eventBus: EventBus,
    modeling: Modeling,
    elementRegistry: ElementRegistry,
    directEditing: any,
    canvas: Canvas,
    textRenderer: TextRenderer,
  ) {
    this.canvas = canvas;
    this.textRenderer = textRenderer;
    this.modeling = modeling;

    // workaround found here: https://forum.bpmn.io/t/external-label-for-custom-elements/8685
    const preLabelCreate: EventBusEventCallback<{ context: { shape: Shape } }> = (event) => {
      const {
        context: { shape },
      } = event;

      if (isLabel(shape) && is(shape, 'proceed:GenericResource') && shape.businessObject) {
        shape.oldBusinessObject = shape.businessObject;
        shape.businessObject = undefined;
        return false;
      }
    };

    eventBus.on('commandStack.shape.create.preExecute', 1500, preLabelCreate);

    const postLabelCreate: EventBusEventCallback<{ context: { shape: Shape } }> = (event) => {
      let {
        context: { shape },
      } = event;

      if (isLabel(shape) && is(shape, 'proceed:GenericResource') && !shape.businessObject) {
        const businessObject = shape.oldBusinessObject;
        modeling.removeElements([shape]);

        shape = elementRegistry.get(businessObject.id) as any;
        shape.label = modeling.createLabel(
          shape,
          {
            x: shape.x + shape.width / 2,
            y: shape.y + shape.height + 20,
          },
          {
            id: shape.businessObject.id + '_label',
            businessObject: shape.businessObject,
            di: shape.di,
          },
        );
        if (shape.name) modeling.updateLabel(shape.label as any, shape.name);
      }
    };

    eventBus.on('commandStack.shape.create.postExecute', 1500, postLabelCreate);

    directEditing.registerProvider(this);

    const onResourceDoubleClick: EventBusEventCallback<{ element: Shape }> = (event) => {
      let { element } = event;
      if (is(element, 'proceed:GenericResource') && !isLabel(element)) {
        if (!element.label) {
          // create a label that we can target with direct editing when a user double clicks a resource
          // that does not have a label
          modeling.createLabel(
            element,
            {
              x: element.x + element.width / 2,
              y: element.y + element.height + 20,
            },
            {
              id: element.businessObject.id + '_label',
              businessObject: element.businessObject,
              di: element.di,
            },
          );
        }
        // overlay the element with an editable textbox so the user can edit the label directly in the modeler
        directEditing.activate(element.label);
      }
    };

    eventBus.on('element.dblclick', 1500, onResourceDoubleClick);

    const postAdd: EventBusEventCallback<{ element: Shape }> = ({ element }) => {
      if (
        is(element, 'proceed:GenericResource') &&
        !isLabel(element) &&
        !element.label &&
        element.di &&
        element.di.label &&
        element.di.label.bounds
      ) {
        // recreate labels when importing an xml into the modeler
        modeling.createLabel(
          element,
          {
            x: element.di.label.bounds.x,
            y: element.di.label.bounds.y,
            width: element.di.label.bounds.width,
            height: element.di.label.bounds.height,
          } as any,
          {
            id: element.businessObject.id + '_label',
            businessObject: element.businessObject,
            di: element.di,
          },
        );
      }
    };

    eventBus.on('shape.added', 1500, postAdd);
  }

  // this function is called by the direct-editing module and should return information about the editing box
  // to display for direct editing
  activate(element: Shape) {
    const { canvas, textRenderer } = this;

    const target = isLabel(element) ? element : element.label!;

    const bbox = canvas.getAbsoluteBBox(target);

    const mid = {
      x: bbox.x + bbox.width / 2,
      y: bbox.y + bbox.height / 2,
    };

    const zoom = canvas.zoom();

    const externalStyle = textRenderer.getExternalStyle();
    const externalFontSize = externalStyle.fontSize * zoom;
    const externalLineHeight = externalStyle.lineHeight;

    const width = 90 * zoom;
    const paddingTop = 7 * zoom;
    const paddingBottom = 4 * zoom;
    const height = bbox.height + paddingTop + paddingBottom;

    const bounds = {
      width,
      height,
      x: mid.x - width / 2,
      y: mid.y - height / 2,
    };

    const style = {
      fontFamily: textRenderer.getDefaultStyle().fontFamily,
      fontWeight: textRenderer.getDefaultStyle().fontWeight,
      fontSize: externalFontSize + 'px',
      lineHeight: externalLineHeight,
      paddingTop: paddingTop + 'px',
      paddingBottom: paddingBottom + 'px',
      backgroundColor: '#ffffff',
      border: '1px solid #ccc',
    };

    const options = {
      autoResize: true,
    };

    return {
      bounds,
      style,
      options,
      text: target.businessObject.name || '',
    };
  }

  // this is called when direct editing ends and the changes should be commit to the label
  update(element: Shape, newLabel: string) {
    this.modeling.updateLabel(isLabel(element) ? element.labelTarget : element, newLabel);
  }
}

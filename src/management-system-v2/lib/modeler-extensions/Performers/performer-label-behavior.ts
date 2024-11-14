import TextRenderer from 'bpmn-js/lib/draw/TextRenderer';
import Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import { isLabel } from 'bpmn-js/lib/util/LabelUtil';
import { is } from 'bpmn-js/lib/util/ModelUtil';
import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor';
import EventBus from 'diagram-js/lib/core/EventBus';

export default class LabelBehavior extends CommandInterceptor {
  static $inject = ['eventBus', 'modeling', 'textRenderer'];
  constructor(eventBus: EventBus, modeling: Modeling, textRenderer: TextRenderer) {
    super(eventBus);

    // here we intercept some of the editing events in the modeler to inject our logic for label
    // creation on performer elements or to prevent some default bpmn-js logic to run which would
    // cause errors

    this.preExecute('element.updateLabel', (event: any) => {
      const { context } = event;
      const { element, newLabel } = context;

      if (is(element, 'proceed:Performer')) {
        if (!isLabel(element)) {
          // ensure that a label is automatically added to an element before we try to change it
          if (newLabel && !element.label) {
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
          // prevent default functionality that cannot find the label on our custom elements
          // without this the label would be removed if the name of a performer is changed through the properties panel
          if (element.label) {
            context.element = element.label!;
          }
        }
      }
    });

    this.postExecute('element.updateLabel', (event: any) => {
      const { context } = event;
      const { element, newLabel } = context;
      if (is(element, 'proceed:Performer')) {
        if (newLabel !== element.businessObject.name) {
          modeling.updateModdleProperties(element, element.businessObject, { name: newLabel });
        }
        // prevent that the default handler tries to get the new bounds since it is unable to for
        // our custom element
        if (newLabel && !context.newBounds) {
          context.newBounds = textRenderer.getExternalLabelBounds(
            isLabel(element) ? element : element.label,
            element.businessObject.name,
          );
        } else if (!newLabel && element.businessObject.name) {
          // if the label is deleted make sure to remove the name of the element
          modeling.updateModdleProperties(element, element.businessObject, { name: undefined });
        }
      }
    });
  }
}

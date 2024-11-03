import BpmnFactory from 'bpmn-js/lib/features/modeling/BpmnFactory';
import PopupMenu, {
  PopupMenuProvider,
  PopupMenuEntry,
} from 'diagram-js/lib/features/popup-menu/PopupMenu';
import Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import Replace from 'diagram-js/lib/features/replace/Replace';
import Rules from 'diagram-js/lib/features/rules/Rules';
import { Shape } from 'bpmn-js/lib/model/Types';

import { isArray } from 'min-dash';
import { is } from 'bpmn-js/lib/util/ModelUtil';

export default class ResourceReplacementProvider implements PopupMenuProvider {
  modeling: Modeling;
  rules: Rules;
  bpmnFactory: BpmnFactory;
  replace: Replace;

  static $inject = ['bpmnFactory', 'popupMenu', 'modeling', 'replace', 'rules'];

  constructor(
    bpmnFactory: BpmnFactory,
    popupMenu: PopupMenu,
    modeling: Modeling,
    replace: Replace,
    rules: Rules,
  ) {
    popupMenu.registerProvider('resource-replace', this);

    this.modeling = modeling;
    this.rules = rules;
    this.bpmnFactory = bpmnFactory;
    this.replace = replace;
  }

  getPopupMenuEntries(target: Shape) {
    const { rules, modeling, bpmnFactory, replace } = this;

    if (
      isArray(target) ||
      !rules.allowed('shape.replace', {
        element: target,
      })
    ) {
      return {};
    }

    const entries: { [name: string]: PopupMenuEntry } = {};

    const { businessObject } = target;

    type PerformerType = 'User' | 'Robot' | 'Screen' | 'Laptop' | 'Server';

    const switchType = (newType: PerformerType) => {
      if (is(businessObject, 'proceed:MachinePerformer') && newType !== 'User') {
        // we only need to change the attribute since we change from one machine performer to
        // another
        modeling.updateProperties(target as any, { machineType: newType });
      } else {
        // we need to replace element because we switch between a Human Performer and a
        // Machine Performer
        const newPerformerType =
          newType === 'User' ? 'proceed:HumanPerformer' : 'proceed:MachinePerformer';
        const machineType = newType === 'User' ? undefined : newType;

        const newPerformer = {
          type: newType,
          di: {} as any,
          businessObject: bpmnFactory.create(newPerformerType, { machineType }),
        };

        newPerformer.di.fill = target.di.fill;
        newPerformer.di.stroke = target.di.stroke;
        newPerformer.di['background-color'] = target.di['background-color'];
        newPerformer.di['border-color'] = target.di['border-color'];
        newPerformer.di.color = target.di.color;

        return replace.replaceElement(target, newPerformer, {});
      }
    };

    if (is(businessObject, 'proceed:Performer')) {
      if (is(businessObject, 'proceed:MachinePerformer')) {
        entries.user = {
          label: 'Human Performer',
          className: 'proceed-user-icon',
          action: () => switchType('User'),
        };
      }
      if (businessObject.machineType != 'Robot')
        entries.robot = {
          label: 'IT System: Robot',
          className: 'proceed-robot-icon',
          action: () => switchType('Robot'),
        };
      if (businessObject.machineType != 'Laptop')
        entries.laptop = {
          label: 'IT System: Laptop',
          className: 'proceed-laptop-icon',
          action: () => switchType('Laptop'),
        };
      if (businessObject.machineType != 'Screen')
        entries.screen = {
          label: 'IT System: Screen',
          className: 'proceed-screen-icon',
          action: () => switchType('Screen'),
        };
      if (businessObject.machineType != 'Server')
        entries.server = {
          label: 'IT System: Server',
          className: 'proceed-server-icon',
          action: () => switchType('Server'),
        };
    }

    return entries;
  }
}

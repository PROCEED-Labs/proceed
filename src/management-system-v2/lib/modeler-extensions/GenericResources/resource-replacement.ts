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

    // here we handle how resources are replaced by another resource type through the context menu

    this.modeling = modeling;
    this.rules = rules;
    this.bpmnFactory = bpmnFactory;
    this.replace = replace;
  }

  getPopupMenuEntries(target: Shape) {
    const { rules, modeling } = this;

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

    const resourceInfoMap = {
      User: { label: 'Human Performer', className: 'proceed-user-icon' },
      Robot: { label: 'IT System: Robot', className: 'proceed-robot-icon' },
      Screen: { label: 'IT System: Screen', className: 'proceed-screen-icon' },
      Laptop: { label: 'IT System: Laptop', className: 'proceed-laptop-icon' },
      Server: { label: 'IT System: Server', className: 'proceed-server-icon' },
    } as const;

    const resourceTypes = Object.keys(resourceInfoMap) as Array<keyof typeof resourceInfoMap>;

    type ResourceType = (typeof resourceTypes)[number];

    const switchType = (newType: ResourceType) => {
      modeling.updateProperties(target as any, { resourceType: newType });
    };

    if (is(businessObject, 'proceed:GenericResource')) {
      for (const type of resourceTypes.filter(
        (resourceType) => businessObject.resourceType !== resourceType,
      )) {
        entries[type] = {
          ...resourceInfoMap[type],
          action: () => switchType(type),
        };
      }
    }

    return entries;
  }
}

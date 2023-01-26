import RuleProvider from 'diagram-js/lib/features/rules/RuleProvider';

import { getBusinessObject } from 'bpmn-js/lib/util/ModelUtil';
import store from '@/frontend/main.js';

class CustomRules extends RuleProvider {
  constructor(eventBus) {
    super(eventBus);

    this.addRule('elements.delete', function (context) {
      // don't allow deleting blocked tasks
      return context.elements.filter((e) => {
        if (e.type === 'bpmn:CallActivity') {
          if (getBusinessObject(e).calledElement) {
            const processId = getBusinessObject(e).calledElement.split(':')[1];
            const allProcesses = store.getters['processStore/processes'];
            const callActivity = allProcesses.find((p) => p.processIds.includes(processId));
            if (callActivity && callActivity.inEditingBy.length > 0) {
              return false;
            }
          }
          return true;
        } else {
          const processDefinitionsId = store.getters['processEditorStore/id'];
          const blockedTasks = store.getters['processStore/processById'](
            processDefinitionsId
          ).inEditingBy.map((blocker) => blocker.task);
          return !blockedTasks.includes(e.id);
        }
      });
    });

    this.addRule('shape.resize', 1500, function (context) {
      if (
        (context.shape && context.shape.type === 'bpmn:SequenceFlow') ||
        context.shape.type === 'bpmn:DataInputAssociation' ||
        context.shape.type === 'bpmn:DataOutputAssociation' ||
        context.shape.type === 'label'
      ) {
        return false;
      } else {
        return true;
      }
    });
  }
}

CustomRules.$inject = ['eventBus'];

export default {
  __init__: ['customRules'],
  customRules: ['type', CustomRules],
};

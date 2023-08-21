import { generateUserTaskFileName } from '@proceed/bpmn-helper';

import { getMilestones } from '@/frontend/helpers/bpmn-modeler-events/getters.js';

import ProceedSelectionModule from './proceed-selection.js';
import ProceedMetaModule from './proceed-meta.js';
import CustomModelingModule from '@/frontend/helpers/bpmn-modeler-events/custom-modeling.js';

import { enable5thIndustryIntegration } from '../../../../../../../../FeatureFlags.js';

class ProceedUserTask {
  constructor(
    eventBus,
    proceedConstraints,
    proceedMeta,
    customModeling,
    elementRegistry,
    commandStack,
    canvas
  ) {
    this.eventBus = eventBus;

    this.selectedElement = null;
    this.selectedTaskFileName = null;
    this.selectedTaskMilestones = [];

    eventBus.on('proceedSelection.changed', this.selectionChanged.bind(this));

    eventBus.on('commandStack.shape.replace.preExecute', 10000, ({ context }) => {
      const { oldShape } = context;

      if (oldShape.type === 'bpmn:UserTask') {
        if (oldShape === this.selectedElement) {
          this.selectedTaskFileNameChanged(undefined);
        }

        if (context.newData) {
          context.newData.businessObject.fileName = undefined;
        }
      }
    });

    eventBus.on('commandStack.shape.replace.postExecute', ({ context }) => {
      const { newShape, oldShape } = context;
      // clear commandStack so that these events get distributed
      setTimeout(() => {
        if (newShape.type === 'bpmn:UserTask' && !context.isExternalEvent) {
          const rootMetaData = proceedMeta.getRootMetaData();
          if (
            enable5thIndustryIntegration &&
            (rootMetaData['_5i-Inspection-Plan-ID'] ||
              rootMetaData['_5i-Inspection-Plan-Template-ID'])
          ) {
            customModeling.setUserTaskImplementation(newShape.id, '5thIndustry');
          } else {
            customModeling.setUserTaskFileName(newShape.id, generateUserTaskFileName());
          }
        }

        if (oldShape.type === 'bpmn:UserTask') {
          let constraints = proceedConstraints.getElementConstraints(oldShape.id);

          if (constraints.hardConstraints) {
            constraints.hardConstraints = constraints.hardConstraints.filter(
              (h) => h.name !== 'machine.online'
            );
            customModeling.addConstraintsToElement(
              elementRegistry.get(oldShape.id),
              constraints,
              true
            );
          }
        }
      });
    });

    // cleanup before removing an element
    eventBus.on('commandStack.shape.delete.preExecute', 10000, ({ context }) => {
      let { shape } = context;

      if (shape.type === 'bpmn:UserTask') {
        if (!context.isExternalEvent) {
          eventBus.fire('proceedUserTask.remove.userTask', {
            fileName: shape.businessObject.fileName,
          });
        }
      }
    });

    eventBus.on('commandStack.element.updateProceedData.postExecuted', ({ context }) => {
      const { element, milestones, isExternalEvent } = context;
      if (milestones) {
        if (element === this.selectedElement) {
          this.selectedMilestonesChanged(milestones);
        }
        if (!isExternalEvent && element.businessObject.fileName) {
          this.milestonesChanged({
            milestones: milestones,
            fileName: element.businessObject.fileName,
            element,
          });
        }
      }
    });

    eventBus.on('commandStack.element.updateProceedData.postExecuted', 0, ({ context }) => {
      // if the meta data change is on a userTask => update its label
      if (
        !context.isExternalEvent &&
        context.element.type === 'bpmn:UserTask' &&
        context.metaData &&
        context.metaData['_5i-Inspection-Order-Shortdescription']
      ) {
        commandStack.execute('element.updateProperties', {
          element: context.element,
          properties: { name: context.metaData['_5i-Inspection-Order-Shortdescription'] },
        });
      }

      const processElement = canvas.getRootElements().find((el) => el.type === 'bpmn:Process');
      if (context.element === processElement) {
        const rootMetaData = proceedMeta.getRootMetaData();
        customModeling.changeUserTasksImplementation(
          rootMetaData['_5i-Inspection-Plan-ID'] || rootMetaData['_5i-Inspection-Plan-Template-ID']
        );
      }
    });

    eventBus.on('commandStack.element.updateProperties.postExecute', ({ context }) => {
      const { element, properties, oldProperties } = context;

      if (element.type === 'bpmn:UserTask' && properties.fileName) {
        // create new file for newly added filename
        if (properties.fileName !== oldProperties.fileName && !context.isExternalEvent) {
          eventBus.fire('proceedUserTask.added.fileName', {
            elementId: element.id,
            fileName: properties.fileName,
          });
        }
      }
    });
  }

  selectionChanged({ newSelection }) {
    this.selectedElement = newSelection;
    if (newSelection && newSelection.type === 'bpmn:UserTask') {
      this.selectedMilestonesChanged(getMilestones(newSelection));
      this.selectedTaskFileNameChanged(newSelection.businessObject.fileName);
    } else {
      this.selectedMilestonesChanged([]);
      this.selectedTaskFileNameChanged(null);
    }
  }

  selectedTaskFileNameChanged(newFileName) {
    this.selectedTaskFileName = newFileName;
    this.eventBus.fire('proceedUserTask.selected.changed.fileName', { newFileName });
  }

  selectedMilestonesChanged(newMilestones) {
    this.selectedTaskMilestones = newMilestones;
    this.eventBus.fire('proceedUserTask.selected.changed.milestones', { newMilestones });
  }

  getSelectedTaskMilestones() {
    return this.selectedTaskMilestones;
  }

  milestonesChanged(changeInfo) {
    this.eventBus.fire('proceedUserTask.changes.milestones', { ...changeInfo });
  }

  getSelectedTaskFileName() {
    return this.selectedTaskFileName;
  }
}

ProceedUserTask.$inject = [
  'eventBus',
  'proceedConstraints',
  'proceedMeta',
  'customModeling',
  'elementRegistry',
  'commandStack',
  'canvas',
];

export default {
  __init__: ['proceedUserTask'],
  __depends__: [ProceedSelectionModule, ProceedMetaModule, CustomModelingModule],
  proceedUserTask: ['type', ProceedUserTask],
};

import { getMetaData } from '@/frontend/helpers/bpmn-modeler-events/getters.js';
import ProceedSelectionModule from './proceed-selection';

class ProceedMeta {
  constructor(eventBus, canvas) {
    this.rootMetaData = {};
    this.selectedElementMetaData = {};
    this.selectedElement = null;

    eventBus.on('commandStack.postExecuted', 0, ({ command, context }) => {
      if (command === 'element.updateProceedData') {
        // update the rootMetaData if it changed inside the modeler
        if (context.element.type === 'bpmn:Process') {
          this.rootMetaData = getMetaData(context.element);
          eventBus.fire('proceedMeta.root.changed', { newRootMetaData: this.rootMetaData });
        }

        // update local representation of the meta data of the selected element
        if (context.element === this.selectedElement) {
          this.selectedElementMetaData = getMetaData(this.selectedElement);
          eventBus.fire('proceedMeta.selected.changed', {
            newMetaData: this.selectedElementMetaData,
          });
        }
      }
    });

    eventBus.on('import.done', () => {
      const processElement = canvas.getRootElement();

      // initialize rootMetaData and metaData with values from the process element
      this.selectedElementMetaData = getMetaData(processElement);
      this.rootMetaData = getMetaData(processElement);

      eventBus.fire('proceedMeta.root.changed', { newRootMetaData: this.rootMetaData });
      eventBus.fire('proceedMeta.selected.changed', { newMetaData: this.selectedElementMetaData });
    });

    eventBus.on('proceedSelection.changed', ({ newSelection }) => {
      if (newSelection) {
        this.selectedElementMetaData = getMetaData(newSelection);
        this.selectedElement = newSelection;
      } else {
        this.selectedElementMetaData = {};
        this.selectedElement = null;
      }
      eventBus.fire('proceedMeta.selected.changed', { newMetaData: this.selectedElementMetaData });
    });
  }

  getRootMetaData() {
    return this.rootMetaData;
  }

  getSelectedElementMetaData() {
    return this.selectedElementMetaData;
  }
}

ProceedMeta.$inject = ['eventBus', 'canvas'];

export default {
  __init__: ['proceedMeta'],
  __depends__: [ProceedSelectionModule],
  proceedMeta: ['type', ProceedMeta],
};

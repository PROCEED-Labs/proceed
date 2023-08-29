<template>
  <div>
    <tooltip-button v-if="flowNodeSelected" @click="openTaskConstraintEditor">
      <template #tooltip-text>Edit Task Constraints</template>
      mdi-square-edit-outline
    </tooltip-button>

    <tooltip-button v-else-if="isSubprocess" @click="openTaskConstraintEditor">
      <template #tooltip-text>Edit Task Constraints for Subprocess</template>
      mdi-square-edit-outline
    </tooltip-button>
    <tooltip-button
      v-else-if="selectedElement.type === 'bpmn:Process'"
      @click="isProcessConstraintsDialogVisible = true"
    >
      <template #tooltip-text>Edit Process Constraints</template>
      mdi-square-edit-outline
    </tooltip-button>

    <process-constraints-modal
      :id="process.id"
      :showDialog="isProcessConstraintsDialogVisible"
      :elementConstraintMapping="elementConstraintMapping"
      :elementId="selectedElement.id"
      @close="isProcessConstraintsDialogVisible = false"
      @update="addConstraints"
    />

    <constraint-editor
      :show="isEditConstraintDialogVisible"
      title="Task Constraints"
      level="task"
      :elementId="selectedElement.id"
      :elementConstraintMapping="elementConstraintMapping"
      @save="addConstraints"
      @close="closeTaskConstraintsEditor"
    />
  </div>
</template>
<script>
import TooltipButton from '@/frontend/components/universal/TooltipButton.vue';
import ProcessConstraintsModal from '@/frontend/components/constraints/ProcessConstraintsModal.vue';
import ConstraintEditor from '@/frontend/components/constraints/ConstraintEditor.vue';

import { eventHandler } from '@/frontend/backend-api/index.js';

export default {
  components: {
    TooltipButton,
    ProcessConstraintsModal,
    ConstraintEditor,
  },
  props: {
    process: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      isProcessConstraintsDialogVisible: false,
      isEditConstraintDialogVisible: false,

      elementConstraintMapping: {},
      /**
       * eventHandling callbacks
       */
      /** */
      constraintChangedCallback: null,
    };
  },
  computed: {
    modeler() {
      return this.$store.getters['processEditorStore/modeler'];
    },
    selection() {
      return this.$store.getters['processEditorStore/selectedElement'];
    },
    selectedElement() {
      if (this.selection && this.selection.id.includes('_plane')) {
        // if we have an open subprocess and no element is selected by the user the selection will be the subprocess plane
        // => we map this to the subprocess being selected
        return this.modeler.get('elementRegistry').get(this.selection.id.replace(/_plane/g, ''));
      } else {
        return this.selection;
      }
    },
    isSubprocess() {
      return this.selectedElement && this.selectedElement.type === 'bpmn:SubProcess';
    },
    /**
     * Checks if a flow node was selected
     */
    flowNodeSelected() {
      if (this.selectedElement && this.selectedElement.type) {
        const elements = [
          new RegExp('Task'),
          new RegExp('SubProcess'),
          new RegExp('CallActivity'),
          new RegExp('Gateway'),
          new RegExp('Event'),
        ];
        // we want to display a different prompt if a collapsed subprocess is currently open and no element is selected inside it
        const selectionIsCollapsedSubprocessPlane =
          this.modeler.get('canvas').getRootElement().id === `${this.selectedElement.id}_plane`;
        if (
          !selectionIsCollapsedSubprocessPlane &&
          elements.some((expression) => expression.test(this.selectedElement.type))
        ) {
          return true;
        }
      }

      return false;
    },
  },
  methods: {
    addConstraints(constraints, element = this.selectedElement, dontPropagate = false) {
      this.modeler
        .get('customModeling')
        .addConstraintsToElement(element, constraints, dontPropagate);
    },

    openTaskConstraintEditor() {
      this.blockTask();
      this.isEditConstraintDialogVisible = true;
    },

    closeTaskConstraintsEditor() {
      this.unblockTask();
      this.isEditConstraintDialogVisible = false;
    },

    blockTask() {
      this.$store.dispatch('processStore/startEditingTask', {
        taskId: this.selectedElement.id,
        processDefinitionsId: this.process.id,
      });
    },

    unblockTask() {
      this.$store.dispatch('processStore/stopEditingTask', {
        taskId: this.selectedElement.id,
        processDefinitionsId: this.process.id,
      });
    },
  },
  watch: {
    modeler: {
      handler(newModeler) {
        if (newModeler) {
          this.elementConstraintMapping = newModeler
            .get('proceedConstraints')
            .getConstraintMapping();

          newModeler
            .get('eventBus')
            .on(
              'proceedConstraints.changed.elementConstraintMapping',
              ({ elementConstraintMapping }) => {
                this.elementConstraintMapping = { ...elementConstraintMapping };
              },
            );
        }
      },
      immediate: true,
    },
  },
  mounted() {
    this.constraintChangedCallback = eventHandler.on(
      'elementConstraintsChanged',
      ({ processDefinitionsId, elementId, constraints }) => {
        if (this.modeler && this.process.id === processDefinitionsId) {
          this.addConstraints(
            constraints,
            this.modeler.get('elementRegistry').get(elementId),
            true,
          );
        }
      },
    );
  },
  beforeDestroy() {
    eventHandler.off('elementConstraintsChanged', this.constraintChangedCallback);
  },
};
</script>

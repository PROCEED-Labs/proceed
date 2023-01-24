<template>
  <v-checkbox
    v-show="isTask"
    :disabled="editingDisabled"
    :value="isExternal"
    @change="changeExternal"
    label="External"
  />
</template>
<script>
export default {
  data() {
    return {
      isExternal: false,
    };
  },
  computed: {
    isTask() {
      return (
        this.selectedElement.type === 'bpmn:Task' ||
        this.selectedElement.type === 'bpmn:UserTask' ||
        this.selectedElement.type === 'bpmn:ScriptTask' ||
        this.selectedElement.type === 'bpmn:ManualTask' ||
        this.selectedElement.type === 'bpmn:ServiceTask'
      );
    },
    modeler() {
      return this.$store.getters['processEditorStore/modeler'];
    },
    selectedElement() {
      return this.$store.getters['processEditorStore/selectedElement'];
    },
    editingDisabled() {
      return this.$store.getters['processEditorStore/editingDisabled'];
    },
  },
  methods: {
    changeExternal(val) {
      this.modeler.get('customModeling').setTaskExternal(this.selectedElement, val);
    },
    watchExternalChange({ context: { properties, element } }) {
      if (properties.hasOwnProperty('external') && element.id === this.selectedElement.id) {
        this.isExternal = properties.external;
      }
    },
  },
  watch: {
    modeler: {
      handler(newModeler) {
        if (newModeler) {
          const eventBus = newModeler.get('eventBus');

          eventBus.on(
            'commandStack.element.updateProperties.postExecute',
            this.watchExternalChange
          );
        }
      },
      immediate: true,
    },
    selectedElement: {
      handler(newSelection) {
        if (newSelection && newSelection.businessObject) {
          this.isExternal = newSelection.businessObject.external;
        } else {
          this.isExternal = false;
        }
      },
      immediate: true,
    },
  },
  beforeDestroy() {
    if (this.modeler) {
      this.modeler
        .get('eventBus')
        .off('commandStack.element.updateProperties.postExecute', this.watchExternalChange);
    }
  },
};
</script>

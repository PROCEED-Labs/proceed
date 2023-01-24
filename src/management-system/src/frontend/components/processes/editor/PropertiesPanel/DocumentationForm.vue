<template>
  <v-container class="Documentation">
    <p class="font-weight-medium">Documentation</p>
    <v-textarea
      :disabled="editingDisabled"
      label="Element Documentation"
      background-color="white"
      :value="elementDocumentation"
      @input="elementDocumentation = $event"
      @blur="applyDocumentation"
      filled
    />
  </v-container>
</template>
<script>
import { getDocumentation } from '@/frontend/helpers/bpmn-modeler-events/getters.js';

export default {
  data() {
    return {
      elementDocumentation: '',
    };
  },
  computed: {
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
    applyDocumentation() {
      const selectedElementId = this.selectedElement.id;
      this.modeler
        .get('customModeling')
        .updateDocumentation(selectedElementId, this.elementDocumentation);
    },
  },
  watch: {
    modeler: {
      handler(newModeler) {
        if (newModeler) {
          const eventBus = newModeler.get('eventBus');

          eventBus.on('commandStack.postExecuted', 0, ({ command, context }) => {
            if (
              command === 'element.updateDocumentation' &&
              context.element === this.selectedElement
            ) {
              this.elementDocumentation = getDocumentation(this.selectedElement);
            }
          });
        }
      },
      immediate: true,
    },
    selectedElement: {
      handler(newSelection) {
        if (newSelection) {
          this.elementDocumentation = getDocumentation(newSelection);
        } else {
          this.elementDocumentation = '';
        }
      },
      immediate: true,
    },
  },
};
</script>

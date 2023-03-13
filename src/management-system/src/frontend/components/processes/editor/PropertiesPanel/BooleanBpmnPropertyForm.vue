<template>
  <v-checkbox
    v-show="propertyIsValidForElement"
    :disabled="editingDisabled"
    :value="currentPropertyValue"
    @change="changeProperty"
    :label="label"
  />
</template>
<script>
import { isAny } from 'bpmn-js/lib/util/ModelUtil.js';

export default {
  props: {
    propertyName: {
      type: String,
      required: true,
    },
    label: {
      type: String,
      required: true,
    },
    validFor: {
      type: Array,
      required: true,
    },
  },
  data() {
    return {
      currentPropertyValue: false,
    };
  },
  computed: {
    propertyIsValidForElement() {
      return isAny(this.selectedElement, this.validFor);
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
    changeProperty(val) {
      this.modeler
        .get('customModeling')
        .updateProperty(this.selectedElement, this.propertyName, val);
    },
    /**
     * React to updateProperty events that change the handled property and act on the currently selected element
     */
    watchPropertyChange({ context: { properties, element } }) {
      if (properties.hasOwnProperty(this.propertyName) && element.id === this.selectedElement.id) {
        this.currentPropertyValue = properties[this.propertyName];
      }
    },
  },
  watch: {
    modeler: {
      handler(newModeler) {
        if (newModeler) {
          // setup a listener on the modelers eventBus that listens for property updates on bpmn elements
          const eventBus = newModeler.get('eventBus');

          eventBus.on(
            'commandStack.element.updateProperties.postExecute',
            this.watchPropertyChange
          );
        }
      },
      immediate: true,
    },
    selectedElement: {
      // Make sure that the value shown by the checkbox changes when a new element is selected
      handler(newSelection) {
        if (newSelection && newSelection.businessObject) {
          this.currentPropertyValue = newSelection.businessObject[this.propertyName];
        } else {
          this.currentPropertyValue = false;
        }
      },
      immediate: true,
    },
  },
  beforeDestroy() {
    if (this.modeler) {
      // make sure that the listener registered by this component is unregistered before the component is destroyed to prevent it from accessing the component after it was destroyed
      this.modeler
        .get('eventBus')
        .off('commandStack.element.updateProperties.postExecute', this.watchPropertyChange);
    }
  },
};
</script>

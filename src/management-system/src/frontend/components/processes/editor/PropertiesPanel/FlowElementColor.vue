<template>
  <v-container v-if="selectedElement.type !== 'bpmn:Process'" class="Colors">
    <p class="font-weight-medium">Colors</p>
    <p v-if="selectedElement.type !== 'bpmn:SequenceFlow'" class="ml-3">Background Color</p>
    <v-color-picker
      :disabled="editingDisabled"
      v-if="selectedElement.type !== 'bpmn:SequenceFlow'"
      mode="hexa"
      class="v-color-picker__input"
      @input="updateBackgroundColor"
      v-model="backgroundColor"
    ></v-color-picker>
    <p class="ml-3 mt-2">Stroke Color</p>
    <v-color-picker
      :disabled="editingDisabled"
      mode="hexa"
      class="v-color-picker__input"
      @input="updateStrokeColor"
      v-model="frameColor"
    ></v-color-picker>
  </v-container>
</template>
<script>
import { getFillColor, getStrokeColor } from 'bpmn-js/lib/draw/BpmnRenderUtil';

export default {
  data() {
    return {
      backgroundColor: '#FFFFFFFF',
      frameColor: '#000000FF',
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
    async updateBackgroundColor() {
      const modeling = this.modeler.get('modeling');
      modeling.setColor(this.selectedElement, {
        fill: this.backgroundColor,
      });
    },
    async updateStrokeColor() {
      const modeling = this.modeler.get('modeling');
      modeling.setColor(this.selectedElement, {
        stroke: this.frameColor,
      });
    },
  },
  watch: {
    modeler: {
      handler(newModeler) {
        if (newModeler) {
          // keep the color pickers up to date when the colors change (might be triggered by an external event)
          newModeler
            .get('eventBus')
            .on(
              'commandStack.element.updateProperties.postExecuted',
              ({ context: { element, properties } }) => {
                // check if the change is on the current element and if it is a graphical change
                if (element === this.selectedElement && properties.di) {
                  const { fill, stroke } = properties.di;

                  if (fill) this.backgroundColor = fill;
                  if (stroke) this.frameColor = stroke;
                }
              },
            );
        }
      },
      immediate: true,
    },
    selectedElement(newSelection) {
      // initialize color values when a new element is selected
      if (newSelection && newSelection.type !== 'bpmn:Process') {
        this.backgroundColor = getFillColor(newSelection, '#FFFFFFFF');
        this.frameColor = getStrokeColor(newSelection, '#000000FF');
      }
    },
  },
};
</script>

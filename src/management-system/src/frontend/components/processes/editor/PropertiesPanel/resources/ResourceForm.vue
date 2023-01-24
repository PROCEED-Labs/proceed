<template>
  <div>
    <v-container v-show="elementHasWorkingPlaces">
      <p class="font-weight-medium">Working Places</p>
      <working-place-selection :process="process" />
    </v-container>

    <process-step-resource-form
      v-if="elementHasWorkingPlaces"
      title="Consumable Material"
      :assignedResources="initialResources.consumableMaterial || []"
      @change="updateResourcesType('consumableMaterial', $event)"
    >
    </process-step-resource-form>
    <process-step-resource-form
      v-if="elementHasWorkingPlaces"
      title="Tool"
      :assignedResources="initialResources.tool || []"
      @change="updateResourcesType('tool', $event)"
    >
    </process-step-resource-form>
    <process-step-resource-form
      v-if="elementHasWorkingPlaces"
      title="Inspection Instrument"
      :assignedResources="initialResources.inspectionInstrument || []"
      @change="updateResourcesType('inspectionInstrument', $event)"
    >
    </process-step-resource-form>
  </div>
</template>
<script>
import ProcessStepResourceForm from './ProcessStepResourceForm.vue';
import WorkingPlaceSelection from './WorkingPlaceSelection.vue';

import { getResources } from '@/frontend/helpers/bpmn-modeler-events/getters.js';

export default {
  components: { WorkingPlaceSelection, ProcessStepResourceForm },
  props: {
    process: Object,
  },
  data() {
    return {
      initialResources: {},
    };
  },
  computed: {
    modeler() {
      return this.$store.getters['processEditorStore/modeler'];
    },
    selectedElement() {
      return this.$store.getters['processEditorStore/selectedElement'];
    },
    elementHasWorkingPlaces() {
      return (
        this.selectedElement.type === 'bpmn:Task' ||
        this.selectedElement.type === 'bpmn:UserTask' ||
        this.selectedElement.type === 'bpmn:ScriptTask' ||
        (this.selectedElement.type === 'bpmn:IntermediateThrowEvent' &&
          this.selectedElement.businessObject.eventDefinitions &&
          !!this.selectedElement.businessObject.eventDefinitions.find(
            (eventDefinition) => eventDefinition.$type === 'bpmn:MessageEventDefinition'
          ))
      );
    },
  },
  methods: {
    // make sure that only the correct ressource type is overwritten by the local change
    updateResourcesType(resourceType, resources) {
      this.updateResources(
        {
          ...this.initialResources,
          [resourceType]: resources,
        },
        this.selectedElement,
        false
      );
    },
    updateResources(resources, element = this.selectedElement) {
      this.modeler.get('customModeling').addResourcesToElement(element, resources);
    },
  },
  watch: {
    modeler: {
      handler(newModeler) {
        if (newModeler) {
          newModeler
            .get('eventBus')
            .on('commandStack.element.updateProceedData.postExecute', ({ context }) => {
              const { elementId, resources } = context;
              if (elementId === this.selectedElement.id && resources) {
                // update the ressource data when it changes on the selected element
                this.initialResources = resources;
              }
            });
        }
      },
      immediate: true,
    },
    selectedElement: {
      handler(newSelection) {
        // re-initialize the ressource data when a new element is selected
        if (newSelection) {
          this.initialResources = getResources(newSelection);
        } else {
          this.initialResources = {};
        }
      },
      immediate: true,
    },
  },
};
</script>

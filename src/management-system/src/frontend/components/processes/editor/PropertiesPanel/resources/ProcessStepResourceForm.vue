<template>
  <v-container>
    <p class="font-weight-medium">{{ title }}</p>
    <v-row v-for="(resource, index) in resourceRows" :key="resource.id">
      <v-col cols="8">
        <resource-selection
          :key="`selection-${resource.id}`"
          :initialResource="resource.id ? { ...resource } : null"
          :availableResources="availableResources"
          @change="
            index !== resourceRows.length - 1
              ? updateResource({ ...$event, quantity: resource.quantity }, resource.id)
              : assignResource({ ...$event, quantity: resource.quantity })
          "
        ></resource-selection>
      </v-col>
      <v-col cols="3">
        <v-text-field
          :disabled="disableEditing"
          :value="resource.quantity"
          :key="`quantity-${resource.id}`"
          type="number"
          min="1"
          max="100"
          :rules="[inputRules.positiveValue]"
          @blur="
            index !== resourceRows.length - 1
              ? updateResource({ ...resource, quantity: $event.target.value })
              : assignResource({ id: resource.id, quantity: $event.target.value })
          "
          label="Quantity"
          hide-details
          filled
          background-color="white"
        />
      </v-col>
      <v-col cols="1" class="d-flex justify-end" v-if="index !== resourceRows.length - 1">
        <v-btn class="my-4" icon color="error" @click="deleteResource(resource.id)" small
          ><v-icon>mdi-delete</v-icon></v-btn
        >
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import ResourceSelection from '@/frontend/components/processes/editor/PropertiesPanel/resources/ResourceSelection.vue';
export default {
  name: 'ProcessStepForm',
  components: { ResourceSelection },
  props: ['title', 'assignedResources', 'disableEditing'],
  data() {
    return {
      newResourceInfo: {
        id: null,
        quantity: 1,
      },
      inputRules: {
        positiveValue: (value) => !value || value >= 1 || 'Quantity must be minimum 1',
      },
    };
  },
  computed: {
    resourceRows() {
      return [...this.assignedResources, this.newResourceInfo];
    },
    resources() {
      return this.$store.getters['environmentConfigStore/resources'];
    },
    availableResources() {
      return this.resources.filter((resource) => {
        return !this.assignedResources.find(
          (assignedResource) => assignedResource.id === resource.id
        );
      });
    },
  },
  methods: {
    validateInput(resourceInfo) {
      return resourceInfo && resourceInfo.id && resourceInfo.quantity && resourceInfo.quantity >= 1;
    },
    getCompleteResourceInfo(resourceInfo) {
      const resource = this.resources.find((resource) => resource.id === resourceInfo.id);

      return resource
        ? {
            id: resource.id,
            shortName: resource.shortName,
            longName: resource.longName,
            manufacturer: resource.manufacturer,
            manufacturerSerialNumber: resource.serialNumber,
            unit: resource.unit,
            description: resource.description,
          }
        : resourceInfo;
    },
    assignResource(newResourceInfo) {
      this.newResourceInfo.id = newResourceInfo.id;
      this.newResourceInfo.quantity = newResourceInfo.quantity;

      if (this.validateInput(newResourceInfo)) {
        this.$emit('change', [
          ...this.assignedResources,
          {
            ...this.getCompleteResourceInfo(newResourceInfo),
            id: newResourceInfo.id,
            quantity: newResourceInfo.quantity,
          },
        ]);

        this.newResourceInfo.id = null;
        this.newResourceInfo.quantity = 1;
      }
    },
    updateResource(updatedResourceInfo, oldResourceId) {
      if (this.validateInput(updatedResourceInfo)) {
        const updatedAssignedRessources = [...this.assignedResources];

        const updatedResourceIndex = updatedAssignedRessources.findIndex(
          (resource) => resource.id === (oldResourceId || updatedResourceInfo.id)
        );

        updatedAssignedRessources.splice(updatedResourceIndex, 1, {
          ...this.getCompleteResourceInfo(updatedResourceInfo),
          id: updatedResourceInfo.id,
          quantity: updatedResourceInfo.quantity,
        });

        this.$emit('change', [...updatedAssignedRessources]);
      }
    },
    deleteResource(oldResourceId) {
      const updatedAssignedRessources = this.assignedResources.filter(
        (resource) => resource.id !== oldResourceId
      );
      this.$emit('change', [...updatedAssignedRessources]);
    },
  },
};
</script>

<template>
  <div>
    <resource-form
      :showForm="showForm"
      :formMode="'Create'"
      @save="saveItem"
      @close="closeForm"
    ></resource-form>
    <property-selection-field
      propertyName="Resource"
      :multipleSelection="false"
      :items="allAvailableResources"
      :itemText="(item) => `${item.shortName} - ${item.longName}`"
      :initialSelected="initialResource"
      @change="changeSelection"
      @create="showForm = true"
    >
      <template #detailedView="{ item }">
        <v-list>
          <v-list-item>
            <v-list-item-content>
              <v-list-item-title>Short Name</v-list-item-title>
              <v-divider></v-divider>
              <span class="text-subtitle-2 font-weight-light">{{ item.shortName }}</span>
            </v-list-item-content>
          </v-list-item>
          <v-list-item>
            <v-list-item-content>
              <v-list-item-title>Long Name</v-list-item-title>
              <span class="text-subtitle-2 font-weight-light">{{ item.longName }}</span>
            </v-list-item-content>
          </v-list-item>
          <v-list-item>
            <v-list-item-content>
              <v-list-item-title>Description</v-list-item-title>
              <span class="text-subtitle-2 font-weight-light">{{ item.description }}</span>
            </v-list-item-content>
          </v-list-item>
        </v-list>
      </template>
    </property-selection-field>
  </div>
</template>

<script>
import PropertySelectionField from '@/frontend/components/processes/editor/PropertiesPanel/PropertySelectionField.vue';
import ResourceForm from '@/frontend/components/environment/forms/ResourceForm.vue';
export default {
  components: { PropertySelectionField, ResourceForm },
  name: 'ResourceSelection',
  props: {
    initialResource: {
      type: Object,
    },
    availableResources: {
      type: Array,
    },
  },
  data() {
    return {
      showForm: false,
    };
  },
  computed: {
    allAvailableResources() {
      return this.initialResource
        ? [...this.availableResources, this.initialResource]
        : [...this.availableResources];
    },
  },
  methods: {
    saveItem(item) {
      this.closeForm();
      this.emitSelection({ ...item });
    },
    closeForm() {
      this.showForm = false;
    },
    changeSelection(selectedResource) {
      this.emitSelection({ ...selectedResource });
    },
    emitSelection(selectedResource) {
      this.$emit('change', selectedResource);
    },
  },
};
</script>

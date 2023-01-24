<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <span class="text-subtitle-2 font-weight-medium">Consumable Materials:</span>
      </v-col>
      <v-col cols="12">
        <resource-data-table
          :items="consumableMaterials"
          :mobileView="size !== 'large'"
        ></resource-data-table>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12">
        <span class="text-subtitle-2 font-weight-medium">Tools:</span>
      </v-col>
      <v-col cols="12">
        <resource-data-table :items="tools" :mobileView="size !== 'large'"></resource-data-table>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12">
        <span class="text-subtitle-2 font-weight-medium">Inspection Instruments:</span>
      </v-col>
      <v-col cols="12">
        <resource-data-table
          :items="inspectionInstruments"
          :mobileView="size !== 'large'"
        ></resource-data-table>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { getResources } from '@/frontend/helpers/bpmn-modeler-events/getters.js';
import ResourceDataTable from '@/frontend/components/deployments/activityInfo/ResourceDataTable.vue';

export default {
  components: { ResourceDataTable },
  props: {
    metaData: Object,
    instance: Object,
    selectedElement: Object,
    title: String,
    location: Object,
    milestones: Array,
    size: { type: String, default: 'large' },
  },
  data() {
    return {
      showDetailedInformationDialog: false,
      requiredDetailedInformation: {},
    };
  },
  computed: {
    resources() {
      return getResources(this.selectedElement);
    },
    consumableMaterials() {
      return this.resources.consumableMaterial;
    },
    tools() {
      return this.resources.tool;
    },
    inspectionInstruments() {
      return this.resources.inspectionInstrument;
    },
  },
  methods: {
    showDetailedInformation(item) {
      this.showDetailedInformationDialog = true;
      this.requiredDetailedInformation = item;
    },
    closeDetailedInformation() {
      this.showDetailedInformationDialog = false;
      this.requiredDetailedInformation = {};
    },
  },
};
</script>

<style lang="scss" scoped></style>

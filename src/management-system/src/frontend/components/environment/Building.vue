<template>
  <corporate-structure-tab-layout title="Building" @create="showForm = true">
    <template #form>
      <building-form
        :editingData="editingBuilding"
        @save="saveItem"
        @close="closeForm"
        :showForm="showForm"
      ></building-form>
    </template>
    <template #table>
      <environment-config-data-table
        :headers="buildingHeaders"
        :items="buildings"
        @edit="editItem"
        @delete="deleteItems"
      >
        <template #item.areas="{ item }">
          <v-chip-group>
            <v-chip small v-for="areaId in item.areaIds" :key="areaId" color="orange">
              {{ getAreaText(areaId) }}</v-chip
            >
          </v-chip-group>
        </template>
        <template #item.workingPlaces="{ item }">
          <v-chip-group>
            <v-chip
              small
              v-for="workingPlaceId in item.workingPlaceIds"
              :key="workingPlaceId"
              color="green"
            >
              {{ getWorkingPlaceText(workingPlaceId) }}</v-chip
            >
          </v-chip-group>
        </template>
      </environment-config-data-table>
    </template>
  </corporate-structure-tab-layout>
</template>

<script>
import CorporateStructureTabLayout from '@/frontend/components/environment/CorporateStructureTabLayout.vue';
import EnvironmentConfigDataTable from '@/frontend/components/environment/EnvironmentConfigDataTable.vue';
import BuildingForm from '@/frontend/components/environment/forms/BuildingForm.vue';
export default {
  components: { EnvironmentConfigDataTable, CorporateStructureTabLayout, BuildingForm },
  data: () => ({
    buildingHeaders: [
      { text: 'ID', value: 'id', hide: true, align: 'left', width: '10%' },
      { text: 'Short Name', value: 'shortName', align: 'left' },
      { text: 'Long Name', value: 'longName', align: 'left' },
      { text: 'Areas', value: 'areas', align: 'left' },
      { text: 'Working Places', value: 'workingPlaces', align: 'left' },
      { text: 'Description', value: 'description', align: 'left', sortable: false },
    ],
    editingBuilding: {
      id: 0,
      longName: '',
      shortName: '',
      areaIds: [],
      workingPlaceIds: [],
      description: '',
    },
    showForm: false,
  }),

  computed: {
    buildings() {
      return this.$store.getters['environmentConfigStore/buildings'];
    },
    areas() {
      return this.$store.getters['environmentConfigStore/areas'];
    },
    workingPlaces() {
      return this.$store.getters['environmentConfigStore/workingPlaces'];
    },
  },

  methods: {
    getAreaText(id) {
      const area = this.areas.find((area) => area.id === id);
      return area ? `${area.shortName} (ID: ${area.id})` : 'Non-existing Area';
    },
    getWorkingPlaceText(id) {
      const workingPlace = this.workingPlaces.find((workingPlace) => workingPlace.id === id);
      return workingPlace
        ? `${workingPlace.shortName} (ID: ${workingPlace.id})`
        : 'Non-existing Working Place';
    },
    closeForm() {
      this.editingBuilding = null;
      this.showForm = false;
    },
    saveItem(itemData) {
      this.$store.dispatch('environmentConfigStore/addBuilding', itemData);
      this.closeForm();
    },
    editItem(item) {
      this.editingBuilding = { ...item };
      this.showForm = true;
    },
    deleteItems(items) {
      items.forEach((item) => {
        this.$store.dispatch('environmentConfigStore/removeBuilding', item.id);
      });
    },
  },
};
</script>
<style lang="scss" scoped></style>

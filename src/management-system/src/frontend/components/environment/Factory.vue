<template>
  <corporate-structure-tab-layout title="Factory" @create="showForm = true">
    <template #form>
      <factory-form
        :editingData="editingFactory"
        @save="saveItem"
        @close="closeForm"
        :showForm="showForm"
      ></factory-form>
    </template>
    <template #table>
      <environment-config-data-table
        :headers="factoryHeaders"
        :items="factories"
        @edit="editItem"
        @delete="deleteItems"
      >
        <template #item.buildings="{ item }">
          <v-chip-group>
            <v-chip
              small
              v-for="buildingId in item.buildingIds"
              :key="buildingId"
              color="blue lighten-2"
            >
              {{ getBuildingText(buildingId) }}</v-chip
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
import FactoryForm from '@/frontend/components/environment/forms/FactoryForm.vue';
export default {
  components: { EnvironmentConfigDataTable, CorporateStructureTabLayout, FactoryForm },
  data: () => ({
    factoryHeaders: [
      { text: 'ID', value: 'id', hide: true, align: 'left', width: '10%' },
      { text: 'Short Name', value: 'shortName', align: 'left' },
      { text: 'Long Name', value: 'longName', align: 'left' },
      { text: 'Buildings', value: 'buildings', align: 'left' },
      { text: 'Description', value: 'description', align: 'left', sortable: false },
    ],
    showForm: false,
    editingFactory: null,
  }),

  computed: {
    factories() {
      return this.$store.getters['environmentConfigStore/factories'];
    },
    buildings() {
      return this.$store.getters['environmentConfigStore/buildings'];
    },
  },

  methods: {
    getBuildingText(id) {
      const building = this.buildings.find((building) => building.id === id);
      return building ? `${building.shortName} (ID: ${building.id})` : 'Non-existing Building';
    },
    closeForm() {
      this.editingFactory = null;
      this.showForm = false;
    },
    saveItem(itemData) {
      this.$store.dispatch('environmentConfigStore/addFactory', itemData);
      this.closeForm();
    },
    editItem(item) {
      this.editingFactory = { ...item };
      this.showForm = true;
    },
    deleteItems(items) {
      items.forEach((item) => {
        this.$store.dispatch('environmentConfigStore/removeFactory', item.id);
      });
    },
  },
};
</script>
<style lang="scss" scoped></style>

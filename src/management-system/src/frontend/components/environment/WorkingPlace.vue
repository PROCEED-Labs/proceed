<template>
  <corporate-structure-tab-layout title="Working Place" @create="showForm = true">
    <template #form>
      <working-place-form
        :editingData="editingWorkingPlace"
        @save="saveItem"
        @close="closeForm"
        :showForm="showForm"
      ></working-place-form>
    </template>
    <template #table>
      <environment-config-data-table
        :headers="workingPlaceHeaders"
        :items="workingPlaces"
        @edit="editItem"
        @delete="deleteItems"
      >
        <template #item.area="{ item }">
          <v-chip v-if="item.areaId && item.areaId.length > 0" small color="orange">
            {{ getAreaText(item.areaId) }}</v-chip
          >
        </template>
        <template #item.equipment="{ item }">
          <v-chip-group>
            <v-chip
              v-for="equipment in item.equipment"
              :key="equipment.resourceId"
              small
              color="grey lighten-2"
            >
              {{ getEquipmentText(equipment) }}</v-chip
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
import WorkingPlaceForm from '@/frontend/components/environment/forms/WorkingPlaceForm.vue';
export default {
  components: { EnvironmentConfigDataTable, CorporateStructureTabLayout, WorkingPlaceForm },
  data: () => ({
    formData: {},
    showForm: false,
    workingPlaceHeaders: [
      { text: 'ID', value: 'id', hide: true, align: 'left', width: '10%' },
      { text: 'Short Name', value: 'shortName', align: 'left' },
      { text: 'Long Name', value: 'longName', align: 'left' },
      { text: 'Area', value: 'area', align: 'left' },
      { text: 'Available Equipment', value: 'equipment', align: 'left', width: '15%' },
      { text: 'Description', value: 'description', align: 'left', sortable: false },
    ],
    editingWorkingPlace: null,
  }),

  computed: {
    workingPlaces() {
      return this.$store.getters['environmentConfigStore/workingPlaces'];
    },
    areas() {
      return this.$store.getters['environmentConfigStore/areas'];
    },
    resources() {
      return this.$store.getters['environmentConfigStore/resources'];
    },
  },

  methods: {
    getAreaText(id) {
      const area = this.areas.find((area) => area.id === id);
      return area ? `${area.shortName} (ID: ${area.id})` : 'Non-existing Area';
    },
    getEquipmentText(equipment) {
      const resource = this.resources.find((resource) => resource.id === equipment.resourceId);
      return resource
        ? `${resource.shortName} (Quantity: ${equipment.quantity})`
        : 'Non-existing Equipment';
    },
    closeForm() {
      this.editingWorkingPlace = null;
      this.showForm = false;
    },
    saveItem(itemData) {
      const equipment = itemData.equipment.reduce((equipmentArray, equipmentObj) => {
        if (equipmentObj.resourceId) {
          equipmentArray.push({
            resourceId: equipmentObj.resourceId,
            quantity: equipmentObj.quantity || 0,
          });
        }

        return equipmentArray;
      }, []);

      const newItem = {
        ...itemData,
        equipment: equipment,
      };
      this.$store.dispatch('environmentConfigStore/addWorkingPlace', newItem);

      this.closeForm();
    },
    editItem(item) {
      // clone nested object without reference
      this.editingWorkingPlace = {
        ...item,
        equipment: item.equipment.map((equipmentObj) => ({ ...equipmentObj })),
      };
      this.showForm = true;
    },
    deleteItems(items) {
      items.forEach((item) => {
        this.$store.dispatch('environmentConfigStore/removeWorkingPlace', item.id);
      });
    },
  },
};
</script>
<style lang="scss" scoped></style>

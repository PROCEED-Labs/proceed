<template>
  <corporate-structure-tab-layout title="Area" @create="showForm = true">
    <template #form>
      <area-form
        :editingData="editingArea"
        @save="saveItem"
        @close="closeForm"
        :showForm="showForm"
      ></area-form>
    </template>
    <template #table>
      <environment-config-data-table
        :headers="areaHeaders"
        :items="areas"
        @edit="editItem"
        @delete="deleteItems"
      >
      </environment-config-data-table>
    </template>
  </corporate-structure-tab-layout>
</template>

<script>
import CorporateStructureTabLayout from '@/frontend/components/environment/CorporateStructureTabLayout.vue';
import EnvironmentConfigDataTable from '@/frontend/components/environment/EnvironmentConfigDataTable.vue';
import AreaForm from '@/frontend/components/environment/forms/AreaForm.vue';
export default {
  components: { EnvironmentConfigDataTable, CorporateStructureTabLayout, AreaForm },
  data: () => ({
    areaHeaders: [
      { text: 'ID', value: 'id', hide: true, align: 'left', width: '10%' },
      { text: 'Short Name', value: 'shortName', align: 'left' },
      { text: 'Long Name', value: 'longName', align: 'left' },
      { text: 'Description', value: 'description', align: 'left', sortable: false },
    ],
    showForm: false,
    editingArea: null,
  }),

  computed: {
    areas() {
      return this.$store.getters['environmentConfigStore/areas'];
    },
  },

  methods: {
    closeForm() {
      this.editingArea = null;
      this.showForm = false;
    },
    saveItem(itemData) {
      this.$store.dispatch('environmentConfigStore/addArea', itemData);
      this.closeForm();
    },
    editItem(item) {
      this.editingArea = { ...item };
      this.showForm = true;
    },
    deleteItems(items) {
      items.forEach((item) => {
        this.$store.dispatch('environmentConfigStore/removeArea', item.id);
      });
    },
  },
};
</script>
<style lang="scss" scoped></style>

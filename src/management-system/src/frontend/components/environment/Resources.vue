<template>
  <v-container>
    <resource-form
      :showForm="showForm"
      :formMode="formMode"
      :resourceData="formData"
      @save="saveItem"
      @close="closeForm()"
    ></resource-form>
    <v-card>
      <v-card-title>
        <v-toolbar-title>Create Resources</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn color="primary" class="mt-3" @click="createItem()"> Add Resource </v-btn>
      </v-card-title>
    </v-card>
    <v-card class="my-6">
      <environment-config-data-table
        :headers="headers"
        :items="resources"
        @edit="editItem"
        @delete="deleteItems"
      >
        <template v-slot:item.tags="{ item }">
          <v-chip-group column>
            <v-chip v-for="(tag, index) in item.tags" :key="index" color="orange" small>{{
              tag
            }}</v-chip>
          </v-chip-group>
        </template>
        <template v-slot:item.details="{ item }">
          <v-icon @click="showItem(item)"> mdi-information-outline </v-icon>
        </template>
      </environment-config-data-table>
    </v-card>
  </v-container>
</template>

<script>
import ResourceForm from '@/frontend/components/environment/forms/ResourceForm.vue';
import EnvironmentConfigDataTable from '@/frontend/components/environment/EnvironmentConfigDataTable.vue';
export default {
  components: { ResourceForm, EnvironmentConfigDataTable },
  data: () => ({
    showForm: false,
    headers: [
      { text: 'ID', value: 'id', align: 'start', hide: true, align: 'left', width: '10%' },
      { text: 'Serial Number', value: 'serialNumber', align: 'left' },
      { text: 'Short Name', value: 'shortName', align: 'left' },
      { text: 'Long Name', value: 'longName', hide: true, align: 'left' },
      { text: 'Manufacturer', value: 'manufacturer', align: 'left' },
      { text: 'Description', value: 'description', hide: true, align: 'left', sortable: false },
      { text: 'Stored Quantity', value: 'storedQuantity', hide: true, align: 'left' },
      { text: 'Reserved Quantity', value: 'reservedQuantity', hide: true, align: 'left' },
      { text: 'Available Quantity', value: 'availableQuantity', align: 'left' },
      { text: 'Unit', value: 'unit', align: 'left', sortable: false },
      { text: 'Tags', value: 'tags', align: 'left', sortable: false },
      { text: 'Details', value: 'details', align: 'center', sortable: false },
    ],
    formMode: 'View', // View | Edit | Create
    formData: {},
  }),

  computed: {
    formTitle() {
      switch (this.formMode) {
        case 'View':
          return 'Resource Information';
        case 'Create':
          return 'New Resource';
        case 'Edit':
          return 'Edit Resource';
        default:
          return '';
      }
    },
    resources() {
      return this.$store.getters['environmentConfigStore/resources'];
    },
  },

  methods: {
    createItem() {
      this.formMode = 'Create';
      this.showForm = true;
    },
    showItem(item) {
      this.formMode = 'View';
      this.formData = { ...item };
      this.showForm = true;
    },
    editItem(item) {
      this.formMode = 'Edit';
      this.formData = { ...item };
      this.showForm = true;
    },
    deleteItems(items) {
      items.forEach((item) => {
        this.$store.dispatch('environmentConfigStore/removeResource', item.id);
      });
    },
    closeForm() {
      this.formData = {};
      this.showForm = false;
    },
    saveItem(item) {
      this.$store.dispatch('environmentConfigStore/addResource', item);
      this.closeForm();
    },
  },
};
</script>
<style lang="scss" scoped></style>

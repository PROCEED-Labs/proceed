<template>
  <v-container>
    <milestone-form
      :showForm="showForm"
      :milestones="milestones"
      :editingData="editingMilestone"
      @save="saveItem"
      @close="closeForm"
    ></milestone-form>
    <v-card>
      <v-card-title>
        <v-toolbar-title>Create Milestones</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn color="primary" class="mt-3" @click="createItem()"> Add Milestone </v-btn>
      </v-card-title>
    </v-card>
    <v-card class="my-6">
      <environment-config-data-table
        :headers="headers"
        :items="milestones"
        @edit="editItem"
        @delete="deleteItems"
      >
      </environment-config-data-table>
    </v-card>
  </v-container>
</template>

<script>
import MilestoneForm from '@/frontend/components/environment/forms/MilestoneForm.vue';
import EnvironmentConfigDataTable from '@/frontend/components/environment/EnvironmentConfigDataTable.vue';
export default {
  components: { MilestoneForm, EnvironmentConfigDataTable },
  data: () => ({
    headers: [
      {
        text: 'ID',
        value: 'id',
        width: '10%',
      },
      { text: 'Name', value: 'name', width: '15%' },
      { text: 'Description', value: 'description', sortable: false },
    ],
    showForm: false,
    editingMilestone: {},
  }),

  computed: {
    milestones() {
      return this.$store.getters['environmentConfigStore/milestones'];
    },
  },

  methods: {
    createItem() {
      this.showForm = true;
    },
    editItem(item) {
      this.editingMilestone = { ...item };
      this.showForm = true;
    },
    deleteItems(items) {
      items.forEach((item) => {
        this.$store.dispatch('environmentConfigStore/removeMilestone', item.id);
      });
    },
    closeForm() {
      this.editingMilestone = null;
      this.showForm = false;
    },
    saveItem(item) {
      this.$store.dispatch('environmentConfigStore/addMilestone', item);
      this.closeForm();
    },
  },
};
</script>
<style lang="scss" scoped></style>

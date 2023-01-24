<template>
  <div>
    <v-toolbar dense tile>
      <v-toolbar-title>Variables</v-toolbar-title>
      <v-toolbar-items class="flex-grow-1">
        <v-tabs show-arrows="mobile" center-active hide-slider optional>
          <v-tab
            v-for="(variable, index) in processVariables"
            :key="index"
            style="flex-direction: column; color: darkslategrey"
            @click="editVariable(index)"
          >
            <div>{{ variable.name }}</div>
            <div class="font-weight-regular" style="text-transform: none; font-size: 0.7rem">
              {{ variable.type }}
            </div>
          </v-tab>
        </v-tabs>
        <v-btn icon @click="isAddVariableDialogVisible = true"><v-icon>mdi-plus</v-icon></v-btn>
      </v-toolbar-items>
    </v-toolbar>

    <variable-form
      :show="isAddVariableDialogVisible"
      @cancel="isAddVariableDialogVisible = false"
      @add="addVariable"
    />

    <variable-form
      :variable="editingVariable"
      :deleteOption="true"
      :show="isEditVariableDialogVisible"
      @cancel="closeVariableEditor"
      @update="updateVariable"
      @delete="deleteVariable"
    />
  </div>
</template>

<script>
import VariableForm from '@/frontend/components/processes/editor/VariableForm.vue';

export default {
  components: {
    VariableForm,
  },
  props: {
    process: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      /** */
      isAddVariableDialogVisible: false,
      /** */
      isEditVariableDialogVisible: false,
      /** */
      editVariableIndex: -1,
    };
  },
  computed: {
    editingVariable() {
      return this.process.variables[this.editVariableIndex];
    },
    processVariables() {
      return this.process.variables;
    },
  },
  methods: {
    /** */
    async saveVariables(variables) {
      await this.$store.dispatch('processStore/update', {
        id: this.process.id,
        changes: { variables },
      });
      this.$emit('showSaveMessage');
    },
    /** */
    async addVariable(newVar) {
      const newVars = this.process.variables;
      if (!newVars.some((variable) => variable.name === newVar.name)) {
        newVars.push(newVar);
        await this.saveVariables(newVars);
        this.isAddVariableDialogVisible = false;
      }
    },
    /** */
    async editVariable(tab) {
      await this.$nextTick();
      this.editVariableIndex = tab;
      this.isEditVariableDialogVisible = true;
    },
    /** */
    async deleteVariable() {
      const newVars = this.process.variables.filter(
        (variable) => variable.name != this.process.variables[this.editVariableIndex].name
      );
      await this.saveVariables(newVars);
      this.closeVariableEditor();
    },
    /** */
    async updateVariable(updateVar) {
      const changedVariables = [...this.processVariables];
      changedVariables[this.editVariableIndex] = updateVar;
      await this.saveVariables(changedVariables);
      this.closeVariableEditor();
    },
    /** */
    closeVariableEditor() {
      this.editVariableIndex = -1;
      this.isEditVariableDialogVisible = false;
    },
  },
};
</script>

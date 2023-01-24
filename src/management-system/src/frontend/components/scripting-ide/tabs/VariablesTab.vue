<template>
  <v-list subheader dense>
    <v-subheader>
      <v-tooltip eager bottom>
        <template v-slot:activator="{ on }">
          <v-btn @click="insertVariableSet()" small v-on="on"
            >Set
            <v-icon small> mdi-database-import </v-icon>
          </v-btn>
        </template>
        <span>Set variable</span>
      </v-tooltip>
      <v-tooltip eager bottom>
        <template v-slot:activator="{ on }">
          <v-btn small @click="insertVariableGet()" v-on="on" class="ml-4"
            >Get
            <v-icon small> mdi-database-export </v-icon>
          </v-btn>
        </template>
        <span>Get variable</span>
      </v-tooltip>
    </v-subheader>
    <v-subheader>
      <v-text-field v-model="variableFilter" prepend-icon="mdi-magnify" placeholder="filter" />
      <v-btn icon ripple @click="createDialog = true">
        <v-icon color="grey lighten-1">mdi-plus</v-icon>
      </v-btn>
    </v-subheader>
    <VariableForm
      :show="createDialog"
      @cancel="createDialog = false"
      @add="openConfirmationDialog('add', $event)"
    />
    <VariableForm
      :variable="editingVariable"
      :show="editDialog"
      @cancel="editDialog = false"
      @update="variableOperation('update', $event)"
    />
    <v-list-item v-for="variable in variablesFiltered" :key="variable.name">
      <v-list-item-content>
        <v-list-item-title class="ml-2" v-text="variable.name"></v-list-item-title>
      </v-list-item-content>
      <v-list-item-content class="mr-7">
        <v-chip color="secondary" text-color="white" small>{{ variable.type }}</v-chip>
      </v-list-item-content>

      <v-list-item-action>
        <v-tooltip eager bottom>
          <template v-slot:activator="{ on }">
            <v-btn icon ripple v-on="on">
              <v-icon color="primary" @click.stop="editVariable(variable)"> mdi-pencil </v-icon>
            </v-btn>
          </template>
          <span>Edit variable</span>
        </v-tooltip>
      </v-list-item-action>
      <v-list-item-action>
        <v-tooltip eager bottom>
          <template v-slot:activator="{ on }">
            <v-btn
              icon
              ripple
              style="margin-left: -20px"
              v-on="on"
              @click.stop="openConfirmationDialog('delete', variable)"
            >
              <v-icon color="error">mdi-delete</v-icon>
            </v-btn>
          </template>
          <span>Delete variable</span>
        </v-tooltip>
      </v-list-item-action>
    </v-list-item>
    <v-dialog v-model="confirmationDialog" max-width="290px">
      <v-card>
        <v-card-title v-if="operation == 'add'" style="text-align: center">
          There is already a variable called {{ variable.name }}
        </v-card-title>
        <v-card-text v-if="operation == 'add'" style="text-align: center">
          Are you sure you want to overwrite it?
        </v-card-text>
        <v-card-title v-if="operation == 'delete'" style="text-align: center">
          Are you sure you want to delete the variable "{{ variable.name }}"?
        </v-card-title>
        <v-card-actions>
          <div style="width: 100%; display: flex; justify-content: center">
            <v-btn
              color="primary"
              @click="
                confirmationDialog = false;
                createDialog = false;
              "
              small
            >
              No
            </v-btn>
            <v-btn
              color="error"
              @click="
                variableOperation(operation, variable);
                confirmationDialog = false;
              "
              small
            >
              Yes
            </v-btn>
          </div>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-list>
</template>

<script>
import * as R from 'ramda';
import {
  createVariableSetFunctionString,
  createVariableGetFunctionString,
} from '@/frontend/helpers/script-editor-helper.js';
import VariableForm from '@/frontend/components/processes/editor/VariableForm.vue';

export default {
  components: { VariableForm },

  props: {
    processDefinitionsId: String,
    code: String,
  },

  data() {
    return {
      variableFilter: '',
      createDialog: false,
      editDialog: false,
      oldVariableName: null,
      editingVariable: null,
      variable: null,
      operation: null,
      confirmationDialog: false,
    };
  },

  computed: {
    variables() {
      return this.$store.getters['processStore/processById'](this.processDefinitionsId).variables;
    },

    variablesFiltered() {
      const self = this;
      return this.variables.filter((variable) => variable.name.includes(self.variableFilter));
    },
  },

  methods: {
    insertVariableSet(variable) {
      this.$emit('insert', createVariableSetFunctionString());
    },

    insertVariableGet(variable) {
      this.$emit('insert', createVariableGetFunctionString());
    },

    editVariable(variable) {
      this.oldVariableName = variable.name;
      this.editingVariable = R.find(R.propEq('name', variable.name), this.variables);
      this.editDialog = true;
    },
    openConfirmationDialog(operation, variable) {
      const { variables } = this;
      if (operation === 'add') {
        if (!R.find(R.propEq('name', variable.name), variables)) {
          this.variableOperation('add', variable);
          return;
        }
      }
      this.confirmationDialog = true;
      this.operation = operation;
      this.variable = variable;
    },
    variableOperation(operation, variable) {
      // load operating set of variables
      let { variables } = this;

      // perform operation
      switch (operation) {
        default:
        case 'add':
          variables = this.addVariableToSet(variables, variable);
          break;

        case 'update':
          variables = this.deleteVariableFromSet(variables, this.oldVariableName);
          variables = this.addVariableToSet(variables, variable);
          break;

        case 'delete':
          variables = this.deleteVariableFromSet(variables, variable.name);
          break;
      }

      // store new state
      this.$store.dispatch('processStore/update', {
        id: this.processDefinitionsId,
        changes: { variables },
      });
      this.operation = null;
      this.variable = null;
      // close dialog if open
      this.createDialog = false;
      this.editDialog = false;
    },

    addVariableToSet(variableSet, variable) {
      // remove duplicates
      const newVariableSet = this.deleteVariableFromSet(variableSet, variable.name);
      newVariableSet.push(variable);

      return newVariableSet;
    },

    deleteVariableFromSet(variableSet, name) {
      return R.reject(R.propEq('name', name), variableSet);
    },
  },
};
</script>

<style></style>

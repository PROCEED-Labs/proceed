<template>
  <v-card flat style="margin: auto" max-width="1000px">
    <v-data-table hide-default-footer :headers="neededHeaders" :items="rows">
      <template v-slot:item="{ item }">
        <tr>
          <td>
            <span>{{ item.name }}</span>
          </td>
          <td>{{ item.condition || '-' }}</td>
          <td>{{ !!item._attributes.weight ? item._attributes.weight : '-' }}</td>
          <td>
            <v-icon class="ml-n4" @click="editRow(item)" color="primary">mdi-pencil</v-icon>
            <v-icon @click="deleteRow(item.name)" color="error">mdi-delete</v-icon>
          </td>
        </tr>
      </template>
      <template v-slot:footer>
        <tr>
          <td>
            <v-select
              v-model="newRow.name"
              :items="isEditing ? constraintChoices : limitedConstraintChoices"
              :readonly="isEditing"
              label="choose constraint name"
              required
            />
          </td>
          <td>
            <v-select
              v-model="newRow.condition"
              label="choose condition"
              :items="softConditions"
              required
            />
          </td>
          <td>
            <v-select
              v-model="newRow._attributes.weight"
              :items="[...Array.from(Array(10), (_, x) => x + 1)]"
              label="choose weight"
            />
          </td>
          <td>
            <v-btn v-if="!isEditing" color="primary" @click="addRow()">Add</v-btn>
            <v-btn v-if="isEditing" color="primary" @click="saveChanges()">Save</v-btn>
          </td>
        </tr>
      </template>
    </v-data-table>
  </v-card>
</template>

<script>
import { mapState } from 'vuex';
import { conditions, softConstraints } from '@/frontend/assets/constraintList.js';
/* eslint-disable no-underscore-dangle */
export default {
  name: 'SoftConstraints',
  props: {
    show: { type: Boolean, default: false },
    chosenConstraints: { type: Object, default: () => {} },
  },
  data: () => ({
    rows: [],
    newRow: {
      _type: 'softConstraint',
      name: null,
      condition: null,
      _attributes: {
        weight: null,
      },
    },
    noConstraintError: false,
    isEditing: false,
  }),
  mounted() {
    this.initRows();
  },
  watch: {
    show() {
      this.initRows();
      this.initForm();
    },
    currentSoftConstraints() {
      this.initRows();
    },
  },
  computed: mapState({
    xml: (state) => state.processEditorStore.xml,
    constraints() {
      return [...softConstraints];
    },
    currentConstraint() {
      return this.constraints.find((c) => c === this.newRow.name);
    },
    currentSoftConstraints() {
      if (this.chosenConstraints.softConstraints) {
        return JSON.parse(JSON.stringify(this.chosenConstraints.softConstraints));
      }

      return [];
    },
    constraintChoices() {
      if (!this.constraints || !this.rows) return [];
      return this.constraints;
    },
    limitedConstraintChoices() {
      if (!this.constraints || !this.rows) return [];
      return this.constraints.filter((c) => !this.rows.some((r) => r.name === c));
    },
    softConditions() {
      return conditions.soft;
    },
    neededHeaders() {
      const headers = [{ text: 'Constraint Name', value: 'name' }];
      headers.push({ text: 'Condition', value: 'condition' });
      headers.push({ text: 'Weight', value: 'weight' });
      headers.push({ text: 'Action', value: 'action' });
      return headers.map((h) => ({ ...h, sortable: false }));
    },
  }),
  methods: {
    initRows() {
      this.rows = this.currentSoftConstraints || [];
    },
    editRow(item) {
      this.isEditing = true;
      this.newRow.name = item.name;
      this.newRow.condition = item.condition;
      this.newRow._attributes.weight = item._attributes.weight;
    },
    saveChanges() {
      this.deleteRow(this.newRow.name, true);
      this.addRow(true);
      this.isEditing = false;
      this.saveSoftConstraints();
    },
    deleteRow(rowName, noSave) {
      this.rows.forEach((row, i, arr) => {
        if (row.name === rowName) {
          arr.splice(i, 1);
        }
      });
      if (!noSave) {
        this.saveSoftConstraints();
      }
    },
    initForm() {
      this.newRow = {
        _type: 'softConstraint',
        name: null,
        condition: null,
        _attributes: {
          weight: null,
        },
      };
    },
    saveSoftConstraints() {
      const allSoftConstraints = this.rows;
      this.$emit('saveSoftConstraints', allSoftConstraints);
    },
    addRow(noSave) {
      this.rows.push(this.newRow);
      this.initForm();
      this.noConstraintError = false;
      if (!noSave) {
        this.saveSoftConstraints();
      }
    },
  },
};
</script>
<style></style>

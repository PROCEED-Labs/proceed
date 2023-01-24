<template>
  <v-card flat style="margin: auto" max-width="1100px">
    <h3>Options:</h3>
    <v-list class="transparent">
      <v-list-item>
        <v-btn @click="newConstraintDialog = true">Add new constraint</v-btn>
        <v-btn @click="chooseGroupDialog = true">Add selected to a group</v-btn>
        <v-btn @click="deleteSelected">Delete selected</v-btn>
      </v-list-item>
    </v-list>
    <v-divider />
    <v-card flat>
      <h3>Ungrouped hard constraints</h3>
      <v-data-table :headers="headers" :items="rows" item-key="name" hide-default-footer>
        <template v-slot:item="{ item }">
          <tr>
            <td>
              <v-checkbox dense v-model="selected" :value="item" :label="item.name"></v-checkbox>
            </td>
            <td>{{ item.condition || '-' }}</td>
            <td>
              <tr v-for="value in item.values" :key="value.value">
                {{
                  value.value
                }}
              </tr>
            </td>
            <td>
              <tr v-for="value in item.values" :key="getKey(value._valueAttributes.unit)">
                {{
                  value._valueAttributes.unit || '-'
                }}
              </tr>
            </td>
            <td>
              <v-icon class="ml-n4" @click="editConstraint(item)" color="primary">
                mdi-pencil
              </v-icon>
              <v-icon color="error" @click="deleteRow(item.name)"> mdi-delete </v-icon>
            </td>
          </tr>
        </template>
      </v-data-table>
    </v-card>
    <v-card flat class="mt-4">
      <h3>Constraint groups</h3>
      <v-data-table
        :headers="headers"
        :items="groupedRows"
        hide-default-footer
        item-key="_attributes.id"
      >
        <template v-slot:item="{ item }">
          <tr style="border-bottom: 1px">
            <td class="borders" :colspan="headers.length - 1">
              <v-row style="margin-left: auto">
                <v-checkbox dense v-model="selected" :value="item">
                  <template v-slot:label v-if="item._attributes.name">
                    Group: {{ item._attributes.name }}; conjunction:
                    {{ item._attributes.conjunction }}
                  </template>
                  <template v-slot:label v-else>
                    Group:<i>&nbsp;No name given</i>; conjunction:
                    {{ item._attributes.conjunction }}
                  </template>
                </v-checkbox>
              </v-row>
            </td>
            <td class="borders">
              <v-tooltip top>
                <template v-slot:activator="{ on, attrs }">
                  <v-icon
                    v-bind="attrs"
                    v-on="on"
                    class="ml-n4"
                    @click="editGroupId = item._attributes.id"
                    color="primary"
                  >
                    mdi-pencil
                  </v-icon>
                </template>
                Edit group
              </v-tooltip>
              <v-tooltip top>
                <template v-slot:activator="{ on, attrs }">
                  <v-icon
                    v-bind="attrs"
                    v-on="on"
                    color="error"
                    @click="
                      deleteGroup(item._attributes.name || item._attributes.id, item._attributes.id)
                    "
                  >
                    mdi-delete
                  </v-icon>
                </template>
                Delete group
              </v-tooltip>
            </td>
          </tr>
          <tr v-for="(constraint, index) in item.constraintGroup" :key="getKey(constraint.name)">
            <td
              v-if="constraint._type == 'hardConstraint'"
              :class="{ borders: index != item.constraintGroup.length - 1 }"
            >
              <span>{{ constraint.name }}</span>
            </td>
            <td
              v-if="constraint._type == 'hardConstraint'"
              :class="{ borders: index != item.constraintGroup.length - 1 }"
            >
              {{ constraint.condition || '-' }}
            </td>
            <td
              v-if="constraint._type == 'hardConstraint'"
              :class="{ borders: index != item.constraintGroup.length - 1 }"
            >
              <tr v-for="value in constraint.values" :key="value.value">
                {{
                  value.value
                }}
              </tr>
            </td>
            <td
              :class="{ borders: index != item.constraintGroup.length - 1 }"
              v-if="constraint._type == 'hardConstraint'"
            >
              <tr v-for="value in constraint.values" :key="getKey(value._valueAttributes.unit)">
                {{
                  value._valueAttributes.unit || '-'
                }}
              </tr>
            </td>
            <td
              :class="{ borders: index != item.constraintGroup.length - 1 }"
              v-if="constraint._type == 'constraintGroupRef'"
              :colspan="headers.length - 1"
            >
              {{ constraint._attributes.ref }}
            </td>
            <td :class="{ borders: index != item.constraintGroup.length - 1 }">
              <v-tooltip top>
                <template v-slot:activator="{ on, attrs }">
                  <v-icon
                    v-bind="attrs"
                    v-on="on"
                    class="ml-n4"
                    @click="editGroupedConstraint(item, constraint)"
                    color="primary"
                  >
                    mdi-pencil
                  </v-icon>
                </template>
                Edit constraint
              </v-tooltip>
              <v-tooltip top>
                <template v-slot:activator="{ on, attrs }">
                  <v-icon
                    v-bind="attrs"
                    v-on="on"
                    @click="deleteGroupedConstraint(item, constraint)"
                    color="error"
                  >
                    mdi-delete
                  </v-icon>
                </template>
                Delete constraint
              </v-tooltip>
              <v-tooltip top>
                <template v-slot:activator="{ on, attrs }">
                  <v-icon v-bind="attrs" v-on="on" @click="ungroupConstraint(item, constraint)">
                    mdi-minus
                  </v-icon>
                </template>
                Ungroup constraint
              </v-tooltip>
            </td>
          </tr>
        </template>
      </v-data-table>
    </v-card>
    <HardConstraintForm
      :level="level"
      :show="newConstraintDialog"
      @add="addRow($event)"
      @cancel="newConstraintDialog = false"
    />
    <HardConstraintForm
      :isEditing="true"
      :constraint="constraintToBeEdited"
      :level="level"
      :show="editConstraintDialog"
      @edit="editRow($event)"
      @cancel="editConstraintDialog = false"
    />
    <GroupConstraintsForm
      :groups="groups"
      :show="chooseGroupDialog"
      @cancel="chooseGroupDialog = false"
      @add="(group, conjunction) => this.addConstraintsToGroup(group, conjunction)"
    />
    <GroupEditor
      :groups="groups"
      :group="groupToEdit"
      :show="!!editGroupId"
      @cancel="editGroupId = ''"
      @edit="(name, conjunction, oldAttrs) => this.saveChangesToGroup(name, conjunction, oldAttrs)"
    />
  </v-card>
</template>

<script>
/* eslint-disable no-underscore-dangle */
import Ids from 'ids';
import { mapState } from 'vuex';
import GroupConstraintsForm from '@/frontend/components/constraints/GroupConstraintsForm.vue';
import GroupEditor from '@/frontend/components/constraints/GroupEditor.vue';
import HardConstraintForm from '@/frontend/components/constraints/HardConstraintForm.vue';
import { generateBpmnId } from '@proceed/bpmn-helper';

export default {
  name: 'HardConstraints',
  props: {
    level: { type: String, required: true },
    show: { type: Boolean, default: false },
    chosenConstraints: { type: Object, default: () => {} },
  },
  components: {
    GroupConstraintsForm,
    GroupEditor,
    HardConstraintForm,
  },
  data: () => ({
    rows: [],
    groupedRows: [],
    groups: [],
    selected: [],
    chooseGroupDialog: false,
    newConstraintDialog: false,
    editConstraintDialog: false,
    constraintToBeEdited: null,
    selectedGroup: null,
    noConstraintError: false,
    isEditing: false,
    groupConstraintEdit: {
      group: null,
      constraint: null,
    },
    editGroupId: '',
    selectedGroupId: null,
  }),
  mounted() {
    this.initRows();
  },
  watch: {
    show() {
      this.initRows();
    },
    hardConstraints() {
      this.initRows();
    },
  },
  computed: mapState({
    groupToEdit() {
      return this.groupedRows.find((x) => x._attributes.id === this.editGroupId);
    },
    xml: (state) => state.processEditorStore.xml,
    hardConstraints() {
      if (this.chosenConstraints.hardConstraints) {
        return JSON.parse(JSON.stringify(this.chosenConstraints.hardConstraints));
      }

      return [];
    },
    headers() {
      const headers = [{ text: 'Constraint Name', value: 'name' }];
      headers.push({ text: 'Condition', value: 'condition' });
      headers.push({ text: 'Values', value: 'value' });
      headers.push({ text: 'Unit', value: 'unit' });
      headers.push({ text: 'Actions', value: 'action' });
      return headers.map((h) => ({ ...h, sortable: false }));
    },
    keys() {
      return new Ids();
    },
  }),
  methods: {
    getKey(name) {
      const newKey = this.keys.next();
      this.keys.claim(newKey);
      return newKey.concat(name || '');
    },
    /**
     * creates a group with a given name and conjunction
     * @param selectedGroup either null or the name of the group
     * @param selectedConjunction the conjunction of the constraints in the group
     */
    createGroup(selectedGroup, selectedConjunction, noSave) {
      const newId = generateBpmnId('cg-');
      const group = {
        _type: 'constraintGroup',
        _attributes: {
          name: selectedGroup,
          id: newId,
          conjunction: selectedConjunction,
        },
        constraintGroup: [],
      };
      this.groups.push(selectedGroup || newId);
      this.groupedRows.unshift(group);
      if (!noSave) {
        this.saveHardConstraints();
      }
    },
    /**
     * edits the name or the conjunction of a group
     */
    saveChangesToGroup(name, conjunction, attrs) {
      const foundIndex = this.groupedRows.findIndex((x) => x._attributes.id === attrs.id);
      const foundIndex2 = this.groups.findIndex((x) => x === attrs.id || x === attrs.name);
      this.groups[foundIndex2] = name || attrs.id;
      this.groupedRows[foundIndex]._attributes.name = name;
      this.groupedRows[foundIndex]._attributes.conjunction = conjunction;
      this.editGroupId = '';
      this.selected = [];
      this.saveHardConstraints();
    },
    saveHardConstraints() {
      this.$emit('saveHardConstraints', this.rows.concat(this.groupedRows));
    },
    /**
     * move selected ungrouped constraints to a chosen group
     */
    addConstraintsToGroup(selectedGroup, selectedConjunction) {
      if (!this.groups.includes(selectedGroup)) {
        this.selectedName = selectedGroup;
        this.createGroup(selectedGroup, selectedConjunction, true);
      }
      this.selected.forEach((constraint) => {
        if (constraint._type === 'constraintGroup') {
          const gr = {
            _type: 'constraintGroupRef',
            _attributes: {
              ref: constraint._attributes.id,
            },
          };
          this.groupedRows
            .find(
              (group) =>
                group._attributes.id === selectedGroup || group._attributes.name === selectedGroup
            )
            .constraintGroup.push(gr);
        } else {
          this.groupedRows
            .find(
              (group) =>
                group._attributes.id === selectedGroup || group._attributes.name === selectedGroup
            )
            .constraintGroup.push(constraint);
          this.deleteRow(constraint.name, true);
        }
      });
      this.selected = [];
      this.chooseGroupDialog = false;
      this.saveHardConstraints();
    },
    initRows() {
      const rows = this.hardConstraints || [];
      this.rows = rows.filter((constraint) => constraint._type === 'hardConstraint');
      this.groupedRows = rows.filter((constraint) => constraint._type === 'constraintGroup');
      this.groups = this.groupedRows.map((group) =>
        group._attributes.name ? group._attributes.name : group._attributes.id
      );
      this.selected = [];
    },
    /**
     * delete a constraint
     */
    deleteRow(rowName, noSave) {
      this.rows.forEach((row, i, arr) => {
        if (row.name === rowName) {
          arr.splice(i, 1);
        }
      });
      this.selected = [];
      if (!noSave) {
        this.saveHardConstraints();
      }
    },
    /**
     * opens a dialog to edit a constraint
     */
    editConstraint(item) {
      this.constraintToBeEdited = JSON.parse(JSON.stringify(item));
      this.editConstraintDialog = true;
    },
    /**
     * opens a dialog to edit a grouped constraint
     */
    editGroupedConstraint(group, constraint) {
      this.groupConstraintEdit.group = group;
      this.groupConstraintEdit.constraint = constraint;
      this.editConstraint(constraint);
    },
    /**
     * saves changes of an edited constraint
     */
    editRow(row) {
      if (this.groupConstraintEdit.group) {
        this.deleteGroupedConstraint(
          this.groupConstraintEdit.group,
          this.groupConstraintEdit.constraint
        );
        this.groupedRows
          .find((group) => group._attributes.id === this.groupConstraintEdit.group._attributes.id)
          .constraintGroup.push(row);
      } else {
        this.deleteRow(row.name, true);
        this.addRow(row, true);
      }
      this.editConstraintDialog = false;
      this.groupConstraintEdit = {
        group: null,
        constraint: null,
      };
      this.saveHardConstraints();
    },
    /**
     * deletes a constraint group and all the constraints in it
     */
    deleteGroup(grName, grId, noSave) {
      this.groups.forEach((gr, i, arr) => {
        if (gr === grName) {
          arr.splice(i, 1);
        }
      });
      this.groupedRows.forEach((row, i, arr) => {
        if (row._attributes.id === grId) {
          arr.splice(i, 1);
        }
      });
      this.selected = [];
      if (!noSave) {
        this.saveHardConstraints();
      }
    },
    /**
     * deletes all selected groups or constraints
     */
    deleteSelected() {
      this.selected.forEach((constraint) => {
        if (constraint._type === 'hardConstraint') {
          this.deleteRow(constraint.name, true);
        } else {
          this.deleteGroup(
            constraint._attributes.name || constraint._attributes.id,
            constraint._attributes.id,
            true
          );
        }
      });
      this.selected = [];
      this.saveHardConstraints();
    },
    /**
     * deletes a grouped constraint
     */
    deleteGroupedConstraint(group, constraint) {
      group.constraintGroup.forEach((c, i, arr) => {
        if (
          (c.name === constraint.name && c.condition === constraint.condition) ||
          (constraint._attributes.ref && c._attributes.ref === constraint._attributes.ref)
        ) {
          arr.splice(i, 1);
        }
      });
      this.saveHardConstraints();
    },
    /**
     * removes a constraint from its group and adds it to the ungrouped constraints
     */
    ungroupConstraint(group, constraint) {
      group.constraintGroup.forEach((c, i, arr) => {
        if (
          (c.name === constraint.name && c.condition === constraint.condition) ||
          (constraint._attributes.ref && c._attributes.ref === constraint._attributes.ref)
        ) {
          arr.splice(i, 1);
          this.addRow(c, true);
        }
      });
      this.saveHardConstraints();
    },
    /**
     * deletes an ungrouped constraint
     */
    deleteConstraints() {
      this.selected.forEach((constraint) => {
        this.deleteRow(constraint.name);
      });
      this.selected = [];
    },
    /**
     * saves newly created constraint
     */
    addRow(newRow, noSave) {
      this.rows.push(newRow);
      this.noConstraintError = false;
      this.newConstraintDialog = false;
      if (!noSave) {
        this.saveHardConstraints();
      }
    },
  },
};
</script>
<style>
.borders {
  border: 0px !important;
  border-collapse: collapse !important;
}
</style>

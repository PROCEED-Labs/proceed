<template>
  <v-dialog :value="show" max-width="520px" @input="cancel" scrollable>
    <v-card>
      <v-card-title>
        <h3 v-if="!isEditing">Add a new hard constraint</h3>
        <h3 v-else>Edit existing hard constraint</h3>
      </v-card-title>
      <v-card-text style="padding-bottom: 0">
        <v-select
          v-model="newRow.name"
          :items="constraintChoices"
          label="choose constraint name"
          required
          :readonly="isEditing"
        />
        <v-select
          v-model="newRow.condition"
          label="choose condition"
          :items="
            constraintConditions.hard
              ? [...constraintConditions.hard.exact, ...constraintConditions.hard.comparative]
              : constraintConditions
          "
          required
        />
        <template v-for="(value, index) in newRow.values">
          <v-row :key="index + 'key'">
            <v-col cols="5">
              <v-text-field v-model="value.value" label="Value" readonly required />
            </v-col>
            <v-col cols="5" v-if="!!value._valueAttributes.unit">
              <v-text-field v-model="value._valueAttributes.unit" label="Unit" readonly required />
            </v-col>
            <v-col cols="2">
              <v-icon
                style="padding: inherit"
                color="error"
                :key="index + 'delete'"
                :id="value"
                @click="deleteValue(value)"
              >
                mdi-delete
              </v-icon>
            </v-col>
          </v-row>
        </template>
        <v-row>
          <v-col cols="5">
            <v-text-field
              v-if="
                !(
                  currentConstraint &&
                  (currentConstraint.valueType === 'Boolean' || currentConstraint.values)
                )
              "
              v-model="curValue.value"
              @input="handleInput"
              label="enter value"
              :hint="constraintHint"
              required
            />
            <v-combobox
              v-if="currentConstraint && currentConstraint.values"
              v-model="curValue.value"
              @update:search-input="handleInput"
              :items="currentConstraint.values"
              label="enter value"
            />
            <v-select
              v-else-if="currentConstraint && currentConstraint.valueType === 'Boolean'"
              v-model="curValue.value"
              :items="['true', 'false']"
              required
            />
          </v-col>
          <v-col
            cols="5"
            v-if="
              !currentConstraint
                ? false
                : currentConstraint.units && currentConstraint.units.length > 0
            "
          >
            <v-select
              :items="constraintUnits"
              v-model="curValue._valueAttributes.unit"
              label="choose unit (Optional)"
              required
            />
          </v-col>
          <v-col cols="2">
            <v-icon style="padding: inherit" @click="addValue()">mdi-plus</v-icon>
          </v-col>
        </v-row>
        <v-select
          v-if="(newRow.values.length > 0 && curValue.value) || newRow.values.length > 1"
          v-model="newRow._valuesAttributes.conjunction"
          label="choose conjunction between values"
          :items="conjunctions"
          required
        />
        <v-row class="mb-n3" v-if="newRow.name == 'machine.possibleConnectionTo'">
          <v-col cols="12"> Latency: </v-col>
        </v-row>
        <v-row v-if="newRow.name == 'machine.possibleConnectionTo'">
          <v-col cols="3">
            <v-select
              v-model="latency.condition"
              label="condition"
              :items="['<', '>', '<=', '>=']"
            />
          </v-col>
          <v-col cols="4">
            <v-text-field v-model="latency.values[0].value" label="value" />
          </v-col>
          <v-col cols="5">
            <v-select
              :items="currentConstraint ? currentConstraint.latency.units : []"
              v-model="latency.values[0]._valueAttributes.unit"
              label="choose unit (Optional)"
            />
          </v-col>
        </v-row>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="cancel">Cancel</v-btn>
        <v-btn v-if="!isEditing" color="primary" @click="addRow()">Add</v-btn>
        <v-btn v-if="isEditing" color="primary" @click="editRow()">Save Changes</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
<script>
import { mapState } from 'vuex';
import { conditions, constraints } from '@/frontend/assets/constraintList.js';

export default {
  props: {
    constraint: { type: Object },
    isEditing: { type: Boolean, default: false },
    level: { type: String },
    show: { type: Boolean, required: true },
  },
  data() {
    return {
      selectedConjunction: 'OR',
      conjunctions: ['AND', 'OR'],
      newRow: this.constraint
        ? this.constraint
        : {
            _type: 'hardConstraint',
            _attributes: {},
            name: null,
            condition: null,
            values: [],
            _valuesAttributes: {
              conjunction: 'OR',
            },
          },
      curValue: {
        value: null,
        _valueAttributes: {
          unit: null,
        },
      },
      latency: {
        _type: 'hardConstraint',
        _attributes: {},
        name: 'latency',
        condition: null,
        values: [
          {
            value: null,
            _valueAttributes: { unit: null },
          },
        ],
        _valuesAttributes: {},
      },
    };
  },
  computed: mapState({
    constraints() {
      if (this.level === 'task') {
        return constraints.filter((c) => c.name !== 'maxTimeGlobal');
      }
      return [...constraints];
    },
    currentConstraint() {
      return this.constraints.find((c) => c.name === this.newRow.name);
    },
    constraintChoices() {
      if (!this.constraints) return [];
      return this.constraints.map((c) => c.name);
    },
    constraintHint() {
      const c = this.currentConstraint;
      return c && c.description ? c.description : '';
    },
    allConditions() {
      return conditions.hard;
    },
    constraintConditions() {
      // constraints can only be mini/maximized if their value is a Number
      const c = this.currentConstraint;
      if (c && c.valueType !== 'Number') return conditions.hard.exact;
      return c ? conditions : [];
    },
    constraintUnits() {
      const c = this.currentConstraint;
      return c && c.units ? c.units : [];
    },
  }),
  methods: {
    cancel() {
      this.resetForm();
      this.$emit('cancel');
    },
    resetForm() {
      this.newRow = {
        _type: 'hardConstraint',
        _attributes: {},
        name: null,
        condition: null,
        values: [],
        _valuesAttributes: {
          conjunction: 'OR',
        },
      };
      this.latency = {
        _type: 'hardConstraint',
        _attributes: {},
        name: 'latency',
        condition: null,
        values: [
          {
            value: null,
            _valueAttributes: { unit: null },
          },
        ],
        _valuesAttributes: {},
      };
      this.resetValue();
    },
    addRow() {
      if (this.newRow.name === 'machine.possibleConnectionTo') {
        this.newRow.hardConstraints = [this.latency];
      }
      if (this.curValue.value) {
        this.addValue();
      }
      this.$emit('add', this.newRow);
      this.resetForm();
    },
    editRow() {
      if (this.curValue.value) {
        this.addValue();
      }
      this.$emit('edit', this.newRow);
      this.resetForm();
    },
    addValue() {
      this.newRow.values.push(this.curValue);
      this.resetValue();
    },
    resetValue() {
      this.curValue = {
        value: null,
        _valueAttributes: {
          unit: null,
        },
      };
    },
    deleteValue(v) {
      this.newRow.values = this.newRow.values.filter((value) => value.value !== v.value);
    },
    handleInput(e) {
      this.curValue.value = e;
    },
  },
  watch: {
    constraint() {
      if (this.constraint) {
        this.newRow = this.constraint;
      }
    },
  },
};
</script>

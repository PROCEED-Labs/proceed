<template>
  <v-dialog :value="show" max-width="1400px" @input="close" scrollable>
    <v-card>
      <v-card-title>
        <span class="headline">{{ title }}</span>
      </v-card-title>
      <v-card-text style="padding: 20px 0">
        <v-tabs vertical>
          <v-tab> Hard Constraints </v-tab>
          <v-tab> Soft constraints </v-tab>
          <v-tab-item>
            <HardConstraints
              :level="level"
              :show="show"
              :chosen-constraints="chosenConstraints"
              @saveHardConstraints="checkHardConstraints"
            />
          </v-tab-item>
          <v-tab-item>
            <SoftConstraints
              :show="show"
              :chosen-constraints="chosenConstraints"
              @saveSoftConstraints="checkSoftConstraints"
            />
          </v-tab-item>
          <ConstraintProblems
            :errors="errors"
            :warnings="warnings"
            :show="constraintDefinitionDialog"
            @goBack="constraintDefinitionDialog = false"
          />
        </v-tabs>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" @click="close()">OK</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import ConstraintParser from '@proceed/constraint-parser-xml-json';
import SoftConstraints from '@/frontend/components/constraints/SoftConstraints.vue';
import HardConstraints from '@/frontend/components/constraints/HardConstraints.vue';
import ConstraintProblems from '@/frontend/components/constraints/ConstraintProblems.vue';
const constraintParser = new ConstraintParser();

export default {
  name: 'ConstraintEditor',
  components: {
    SoftConstraints,
    HardConstraints,
    ConstraintProblems,
  },
  props: {
    title: { type: String, default: 'Constraints' },
    show: { type: Boolean, default: false, required: true },
    level: { type: String, required: true },

    elementId: { type: String },
    elementConstraintMapping: { type: Object, default: () => ({}) },
  },
  data: () => ({
    tab: null,
    errors: [],
    warnings: [],
    constraintDefinitionDialog: false,
    timeout: null,
  }),
  watch: {
    show() {
      if (this.show) {
        this.autoClose();
      }
    },
  },
  computed: {
    config() {
      return this.$store.getters['configStore/config'];
    },
    chosenConstraints: {
      get: function () {
        if (
          this.elementId &&
          this.elementConstraintMapping &&
          this.elementConstraintMapping[this.elementId]
        ) {
          return this.elementConstraintMapping[this.elementId];
        }

        return { hardConstraints: [], softConstraints: [] };
      },
      set: function (newValue) {
        if (this.elementConstraintMapping) {
          this.elementConstraintMapping[this.elementId] = newValue;
        }
      },
    },
  },
  methods: {
    autoClose() {
      if (!process.env.IS_ELECTRON) {
        this.timeout = setTimeout(() => {
          this.close();
        }, this.config.closeOpenEditorsInMs || 300000);
      }
    },
    close() {
      this.$emit('close');
    },
    checkHardConstraints(hardConstraints) {
      clearTimeout(this.timeout);
      this.autoClose();

      const constraintsClone = JSON.parse(JSON.stringify(this.chosenConstraints));
      constraintsClone.softConstraints = constraintsClone.softConstraints || [];
      constraintsClone.hardConstraints = hardConstraints;

      const result = constraintParser.checkConstraintDefinition(constraintsClone);
      if (result.warnings.length > 0 || result.errors.length > 0) {
        this.warnings = result.warnings;
        this.constraintDefinitionDialog = true;
        this.errors = result.errors;
      } else {
        this.saveHardConstraints(hardConstraints);
      }
    },
    checkSoftConstraints(softConstraints) {
      clearTimeout(this.timeout);
      this.autoClose();

      const constraintsClone = JSON.parse(JSON.stringify(this.chosenConstraints));
      constraintsClone.hardConstraints = constraintsClone.hardConstraints || [];
      constraintsClone.softConstraints = softConstraints;

      const result = constraintParser.checkConstraintDefinition(constraintsClone);
      if (result.warnings.length > 0 || result.errors.length > 0) {
        this.warnings = result.warnings;
        this.constraintDefinitionDialog = true;
        this.errors = result.errors;
      } else {
        this.saveSoftConstraints(softConstraints);
      }
    },
    saveHardConstraints(hardConstraints) {
      const constraints = JSON.parse(JSON.stringify(this.chosenConstraints));
      constraints.hardConstraints = hardConstraints;
      this.chosenConstraints = constraints;
      this.$emit('save', constraints);
    },
    saveSoftConstraints(softConstraints) {
      const constraints = JSON.parse(JSON.stringify(this.chosenConstraints));
      constraints.softConstraints = softConstraints;
      this.chosenConstraints = constraints;
      this.$emit('save', constraints);
    },
  },
};
</script>
<style></style>

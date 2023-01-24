<template>
  <v-dialog :value="showDialog" max-width="600px" @input="closeDialog" scrollable>
    <v-card>
      <v-card-title><span class="headline">Process Constraints</span></v-card-title>
      <v-card-text style="padding-bottom: 0">
        <v-form @submit.prevent>
          <v-radio-group v-model="profile" :mandatory="false" column>
            <template style="padding-bottom: 0" #label
              >Choose one of the following profiles or make your own.</template
            >
            <v-container>
              <div v-for="profile in premadeProfiles" :key="profile.name">
                <v-row>
                  <v-radio :value="profile.name" class="mb-0">
                    <template #label>
                      <h4>{{ profile.name.charAt(0).toUpperCase() + profile.name.slice(1) }}</h4>
                    </template>
                  </v-radio>
                </v-row>
                <v-row class="v-label theme--light ml-6 mb-5">{{
                  getConstraintDescription(profile)
                }}</v-row>
              </div>

              <v-row class="mb-5">
                <v-radio value="none">
                  <template #label>
                    <h4>No process constraints</h4>
                  </template>
                </v-radio>
              </v-row>

              <v-row>
                <v-radio value="custom">
                  <template #label>
                    <h4>Custom Profile</h4>
                    <v-icon @click="openConstraintCustomModal()">mdi-pencil</v-icon>
                  </template>
                </v-radio>
              </v-row>

              <v-row class="v-label theme--light ml-6">
                {{ getConstraintDescription({ processConstraints: customConstraints }) }}
              </v-row>
            </v-container>
          </v-radio-group>
        </v-form>
        <ConstraintEditor
          :show="showConstraintCustomModal"
          :title="'Custom Process Constraints'"
          :level="'process'"
          :chosenConstraints="customConstraints"
          :elementId="elementId"
          :elementConstraintMapping="elementConstraintMapping"
          @save="onCustomModalSave($event)"
          @close="showConstraintCustomModal = false"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" @click="closeDialog()">OK</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { mapState } from 'vuex';
import ConstraintEditor from '@/frontend/components/constraints/ConstraintEditor.vue';
import { performance } from '@/frontend/assets/constraintProfiles.js';
import { getConstraintDescription } from '@/frontend/helpers/constraint-helper.js';

export default {
  name: 'ProcessConstraintsModal',
  props: {
    elementConstraintMapping: { type: Object, default: () => ({}) },
    elementId: { type: String, default: '' },
    showDialog: { type: Boolean, default: false },
    id: { type: String },
  },
  components: { ConstraintEditor },
  data: () => ({
    profile: 'none',
    showConstraintCustomModal: false,
  }),
  created() {
    const constraints = this.customConstraints;
    this.profile = this.initProfile(constraints);
  },
  watch: {
    showDialog() {
      const constraints = this.customConstraints;
      this.profile = this.initProfile(constraints);
    },
  },
  computed: {
    customConstraints: {
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
    ...mapState({
      xml: (state) => state.processEditorStore.xml,
      chosenConstraints() {
        switch (this.profile) {
          case 'performance':
            return performance.processConstraints;
          case 'custom':
            return this.customConstraints;
          case 'none':
            return {
              softConstraints: [],
              hardConstraints: [],
            };
          default:
            return {
              softConstraints: [],
              hardConstraints: [],
            };
        }
      },
      premadeProfiles() {
        return [performance];
      },
      getConstraintDescription: () => getConstraintDescription,
    }),
  },
  methods: {
    initProfile(constraints) {
      if (
        !constraints ||
        (!constraints.softConstraints.length && !constraints.hardConstraints.length)
      ) {
        return 'none';
      }
      if (constraints.hardConstraints) {
        if (constraints.hardConstraints.length > 0) {
          return 'custom';
        }
      }
      // find out which profile corresponds to chosen constraints
      let profile = null;
      this.premadeProfiles.forEach((p) => {
        if (
          constraints.softConstraints &&
          constraints.softConstraints.every((c) =>
            p.processConstraints.softConstraints.some(
              (pc) => pc.name === c.name && pc.condition === c.condition
            )
          ) &&
          constraints.softConstraints.length === p.processConstraints.softConstraints.length
        ) {
          profile = p.name;
        }
      });
      return profile || 'custom';
    },
    closeDialog() {
      this.$emit('update', this.chosenConstraints);

      this.$emit('close');
    },
    openConstraintCustomModal() {
      this.showConstraintCustomModal = true;
    },
    onCustomModalSave(event) {
      if (!event) {
        this.customConstraints = [];
      }
      this.profile = this.initProfile(this.customConstraints);
      this.$emit('update', this.customConstraints);
    },
  },
};
</script>

<style>
.headline {
  margin: 0.6rem 1rem;
}
</style>

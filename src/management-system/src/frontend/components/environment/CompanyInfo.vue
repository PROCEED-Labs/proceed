<template>
  <v-container>
    <v-card>
      <v-card-title>
        <span>Company Info</span>
        <v-spacer></v-spacer>
        <v-card-actions>
          <v-btn v-if="editing" :disabled="!valid" color="blue darken-1" text @click="saveItem">
            Save
          </v-btn>
          <v-btn v-else color="blue darken-1" text @click="editing = true"> Edit </v-btn>
        </v-card-actions></v-card-title
      >
      <v-divider></v-divider>
      <v-card-text>
        <v-form :readonly="!editing" ref="form" v-model="valid">
          <div>
            <v-row>
              <v-col cols="6">
                <v-text-field
                  v-model="companyData.shortName"
                  :rules="[(v) => !!v || 'Short Name is required!']"
                  label="Short Name"
                  required
                  :outlined="!editing"
                ></v-text-field>
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="companyData.longName"
                  :rules="[(v) => !!v || 'Long Name is required!']"
                  label="Long Name"
                  required
                  :outlined="!editing"
                ></v-text-field>
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="6">
                <v-autocomplete
                  v-model="companyData.factoryIds"
                  :items="factories"
                  :item-text="(item) => `${item.shortName} (ID: ${item.id})`"
                  :item-value="(item) => item.id"
                  label="Select Factories"
                  multiple
                  chips
                  small-chips
                  deletable-chips
                  :append-icon="editing ? '$dropdown' : ''"
                  :outlined="!editing"
                >
                  <template #selection="{ item }">
                    <v-chip color="red lighten-3">{{ item.shortName }} (ID: {{ item.id }})</v-chip>
                  </template>
                </v-autocomplete>
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="12">
                <v-textarea
                  v-model="companyData.description"
                  rows="3"
                  auto-grow
                  counter
                  label="Description"
                  :clearable="editing"
                  :outlined="!editing"
                ></v-textarea>
              </v-col>
            </v-row>
          </div>
        </v-form>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script>
import { v4 } from 'uuid';
export default {
  components: {},
  data: () => ({
    valid: false,
    editing: false,
    companyData: {
      id: null,
      longName: '',
      shortName: '',
      factoryIds: [],
      description: '',
    },
  }),

  computed: {
    company() {
      return this.$store.getters['environmentConfigStore/company'];
    },
    factories() {
      return this.$store.getters['environmentConfigStore/factories'];
    },
  },

  methods: {
    generateID() {
      return v4();
    },
    saveItem() {
      const newCompany = { ...this.companyData };
      newCompany.id = this.companyData.id || this.generateID();
      this.$store.dispatch('environmentConfigStore/updateCompany', newCompany);

      this.editing = false;
    },
  },
  watch: {
    company: {
      immediate: true,
      handler(newCompany) {
        this.companyData = { ...newCompany };
      },
    },
  },
};
</script>
<style lang="scss">
.v-input.v-text-field--outlined {
  fieldset {
    border: 1px solid rgba(0, 0, 0, 0.38) !important;
  }

  &.v-autocomplete {
    input {
      max-height: 0px !important;
      padding: 0;
    }

    .v-select__selections .v-chip--select {
      opacity: 1 !important;
    }
  }

  .v-label {
    color: rgba(0, 0, 0, 0.87) !important;
  }
}
</style>

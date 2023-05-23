<template>
  <v-dialog :value="showForm" @input="closeForm" max-width="800px">
    <v-card>
      <v-card-title> {{ formTitle }}</v-card-title>
      <v-divider></v-divider>
      <v-card-text>
        <v-form ref="form" v-model="valid">
          <div>
            <v-row>
              <v-col cols="6">
                <v-text-field v-model="buildingData.id" label="ID" disabled></v-text-field>
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="5">
                <v-text-field
                  v-model="buildingData.shortName"
                  :rules="[(v) => !!v || 'Short Name is required!']"
                  label="Short Name"
                  required
                ></v-text-field>
              </v-col>
              <v-col cols="5">
                <v-text-field
                  v-model="buildingData.longName"
                  :rules="[(v) => !!v || 'Long Name is required!']"
                  label="Long Name"
                  required
                ></v-text-field>
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="6">
                <v-autocomplete
                  v-model="buildingData.areaIds"
                  :items="areas"
                  :item-text="(item) => `${item.shortName} (ID: ${item.id})`"
                  :item-value="(item) => item.id"
                  label="Select Areas"
                  multiple
                  chips
                  small-chips
                  deletable-chips
                >
                </v-autocomplete>
              </v-col>
              <v-col cols="6">
                <v-autocomplete
                  v-model="buildingData.workingPlaceIds"
                  :items="workingPlaces"
                  :item-text="(item) => `${item.shortName} (ID: ${item.id})`"
                  :item-value="(item) => item.id"
                  label="Select Working Places"
                  multiple
                  chips
                  small-chips
                  deletable-chips
                >
                </v-autocomplete>
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="12">
                <v-textarea
                  v-model="buildingData.description"
                  rows="3"
                  auto-grow
                  counter
                  clearable
                  label="Description"
                ></v-textarea>
              </v-col>
            </v-row>
          </div>
        </v-form>
      </v-card-text>
      <v-divider></v-divider>
      <v-card-actions class="justify-end">
        <v-btn color="blue darken-1" text @click="closeForm"> Cancel </v-btn>
        <v-btn :disabled="!valid" color="blue darken-1" text @click="saveItem"> Save </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { v4 } from 'uuid';
export default {
  props: {
    editingData: {
      type: Object,
    },
    showForm: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      valid: false,
      buildingData: {
        id: '',
        longName: '',
        shortName: '',
        description: '',
      },
    };
  },

  computed: {
    workingPlaces() {
      return this.$store.getters['environmentConfigStore/workingPlaces'];
    },
    areas() {
      return this.$store.getters['environmentConfigStore/areas'];
    },
    formTitle() {
      return this.editingData && Object.keys(this.editingData).length > 0
        ? 'Edit Building'
        : 'Create Building';
    },
  },
  methods: {
    generateID() {
      return v4();
    },
    resetForm() {
      this.$refs.form.reset();
    },
    closeForm() {
      this.resetForm();
      this.$emit('close');
    },
    saveItem() {
      this.$emit('save', { ...this.buildingData });
      this.resetForm();
    },
  },
  watch: {
    editingData: {
      immediate: true,
      handler(data) {
        if (data && Object.keys(data).length > 0) {
          this.buildingData = { ...data };
        }
      },
    },
    showForm: {
      immediate: true,
      handler(show) {
        if (show && !this.editingData) {
          this.buildingData.id = this.generateID();
        }
      },
    },
  },
};
</script>
<style lang="scss" scoped></style>

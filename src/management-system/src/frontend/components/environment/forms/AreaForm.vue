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
                <v-text-field v-model="areaData.id" label="ID" disabled></v-text-field>
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="5">
                <v-text-field
                  v-model="areaData.shortName"
                  :rules="[(v) => !!v || 'Short Name is required!']"
                  label="Short Name"
                  required
                ></v-text-field>
              </v-col>
              <v-col cols="5">
                <v-text-field
                  v-model="areaData.longName"
                  :rules="[(v) => !!v || 'Long Name is required!']"
                  label="Long Name"
                  required
                ></v-text-field>
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="12">
                <v-textarea
                  v-model="areaData.description"
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
      areaData: {
        id: '',
        longName: '',
        shortName: '',
        description: '',
      },
    };
  },

  computed: {
    formTitle() {
      return this.editingData && Object.keys(this.editingData).length > 0
        ? 'Edit Area'
        : 'Create Area';
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
      this.$emit('save', { ...this.areaData });
      this.resetForm();
    },
  },
  watch: {
    editingData: {
      immediate: true,
      handler(data) {
        if (data && Object.keys(data).length > 0) {
          this.areaData = { ...data };
        }
      },
    },
    showForm: {
      immediate: true,
      handler(show) {
        if (show && !this.editingData) {
          this.areaData.id = this.generateID();
        }
      },
    },
  },
};
</script>
<style lang="scss" scoped></style>

<template>
  <v-dialog :value="showForm" @input="closeForm" max-width="600px">
    <v-card>
      <v-card-title> {{ formTitle }}</v-card-title>
      <v-divider></v-divider>
      <v-card-text>
        <v-form ref="form" v-model="valid">
          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model="milestoneData.id"
                :rules="[inputRules.requiredId, inputRules.noDuplicate]"
                label="ID"
                required
              ></v-text-field>
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="milestoneData.name"
                :rules="[inputRules.requiredName]"
                label="Name"
                required
                for="Name"
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12">
              <v-textarea
                v-model="milestoneData.description"
                rows="3"
                auto-grow
                counter
                clearable
                label="Description"
              ></v-textarea>
            </v-col>
          </v-row>
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
export default {
  props: {
    milestones: {
      type: Array,
    },
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
      milestoneData: {
        id: 0,
        name: '',
        description: '',
      },
      inputRules: {
        requiredId: (id) => !!id || 'ID is required',
        requiredName: (name) => !!name || 'Name is required',
        noDuplicate: (id) => {
          const isDuplicate =
            (!this.isEditing || id !== this.editingData.id) &&
            this.milestones.find((milestone) => milestone.id === id);

          return !isDuplicate || 'ID already exists';
        },
      },
    };
  },

  computed: {
    formTitle() {
      return this.isEditing ? 'Edit Milestone' : 'Create Milestone';
    },
    isEditing() {
      return this.editingData && Object.keys(this.editingData).length > 0;
    },
  },
  methods: {
    resetForm() {
      this.$refs.form.reset();
    },
    closeForm() {
      this.resetForm();
      this.$emit('close');
    },
    saveItem() {
      const newItem = { ...this.milestoneData };
      this.$emit('save', newItem);
      this.resetForm();
    },
  },
  watch: {
    editingData: {
      immediate: true,
      handler(data) {
        if (data && Object.keys(data).length > 0) {
          this.milestoneData = { ...data };
        }
      },
    },
  },
};
</script>
<style lang="scss" scoped></style>

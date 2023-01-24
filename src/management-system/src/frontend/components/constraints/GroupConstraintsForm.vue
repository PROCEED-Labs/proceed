<template>
  <v-dialog :value="show" max-width="500px" @input="cancel" scrollable>
    <v-card>
      <v-card-title><h3>Add selected to a group</h3></v-card-title>
      <v-card-text style="padding-bottom: 0">
        <v-combobox
          v-model="selectedGroup"
          @update:search-input="handleInput"
          :items="groups"
          label="Select existing group or create a new one"
        />
        <v-select
          v-if="!groups.includes(selectedGroup)"
          v-model="selectedConjunction"
          :items="conjunctions"
          label="Select conjunction"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="cancel"> Cancel </v-btn>
        <v-btn color="primary" @click="add()">Add</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
<script>
export default {
  props: {
    groups: { type: Array },
    show: { type: Boolean, required: true },
  },
  data: () => ({
    selectedGroup: null,
    selectedConjunction: 'OR',
    conjunctions: ['AND', 'OR'],
  }),
  methods: {
    cancel() {
      this.resetForm();
      this.$emit('cancel');
    },
    resetForm() {
      this.selectedGroup = null;
      this.selectedConjunction = 'OR';
    },
    add() {
      this.$emit('add', this.selectedGroup, this.selectedConjunction);
      this.resetForm();
    },
    handleInput(e) {
      this.selectedGroup = e;
    },
  },
};
</script>

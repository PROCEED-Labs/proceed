<template>
  <v-dialog :value="show" max-width="500px" @input="cancel" scrollable>
    <v-card>
      <v-card-title><h3>Edit group</h3></v-card-title>
      <v-card-text style="padding-top: 10px; padding-bottom: 0">
        <v-text-field v-model="newName" label="Group name" />
        <v-select v-model="newConjunction" :items="conjunctions" n label="Select conjunction" />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="cancel"> Cancel </v-btn>
        <v-btn color="primary" @click="edit()">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
<script>
/* eslint-disable no-underscore-dangle */
export default {
  name: 'groupEditor',
  props: {
    groups: { type: Array },
    group: { type: Object },
    show: { type: Boolean, required: true },
  },
  data() {
    return {
      conjunctions: ['AND', 'OR'],
      newName: null,
      newConjunction: 'OR',
    };
  },
  methods: {
    cancel() {
      this.resetForm();
      this.$emit('cancel');
    },
    resetForm() {
      this.newName = null;
      this.newConjunction = 'OR';
    },
    edit() {
      this.$emit('edit', this.newName, this.newConjunction, this.group._attributes);
      this.resetForm();
    },
  },
  watch: {
    show: {
      handler(isShown) {
        if (isShown) {
          this.newName = this.group ? this.group._attributes.name : null;
          this.newConjunction = this.group ? this.group._attributes.conjunction : 'OR';
        }
      },
      immediate: true,
    },
  },
};
</script>

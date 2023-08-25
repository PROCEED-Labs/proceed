<template>
  <v-dialog :value="show" @input="close" scrollable max-width="800px">
    <v-card>
      <v-form v-model="valid">
        <v-card-title> Create a new process version </v-card-title>
        <v-card-text>
          <v-text-field
            v-model="versionName"
            label="Version Name"
            :rules="nameRules"
          ></v-text-field>
          <v-textarea
            v-model="versionDescription"
            label="Version Description"
            counter="150"
            rows="3"
            :rules="descriptionRules"
          ></v-textarea>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="close">Cancel</v-btn>
          <v-btn :disabled="!valid" color="primary" @click="createProcessVersion"
            >Create Version</v-btn
          >
        </v-card-actions>
      </v-form>
    </v-card>
  </v-dialog>
</template>
<script>
import { createNewProcessVersion } from './helpers.js';

export default {
  props: {
    show: {
      type: Boolean,
      required: true,
    },
    xml: {
      type: String,
    },
  },
  data() {
    return {
      valid: false,
      versionName: '',
      versionDescription: '',
    };
  },
  computed: {
    processes() {
      return this.$store.getters['processStore/processes'];
    },

    nameRules() {
      const required = (n) => !!n || 'Name is required';
      const onlyWhitespace = (n) =>
        !!n.trim() || 'Name should not consist of only whitespace characters';
      const counter = (n) =>
        (n || '').length <= 30 || 'Name should not be longer than 30 characters';

      return [required, onlyWhitespace, counter];
    },
    descriptionRules() {
      const required = (n) => !!n || 'Description is required';
      const onlyWhitespace = (n) =>
        !!n.trim() || 'Description should not consist of only whitespace characters';
      const counter = (n) =>
        (n || '').length <= 150 || 'Description should not be longer than 150 characters';

      return [required, onlyWhitespace, counter];
    },
  },
  methods: {
    clear() {
      this.versionName = '';
      this.versionDescription = '';
    },
    close() {
      this.clear();
      this.$emit('close');
    },
    async createProcessVersion() {
      const { versionName, versionDescription } = this;
      this.close();

      const newVersion = await createNewProcessVersion(
        this.$store,
        this.xml,
        versionName,
        versionDescription,
      );

      this.$emit('done', newVersion);
    },
  },
};
</script>

<template>
  <div class="d-flex mt-2">
    <v-text-field
      v-model="searchPhrase"
      placeholder="Search Role"
      hide-details
      prepend-inner-icon="mdi-magnify"
      clearable
      solo
      dense
      flat
      background-color="grey lighten-4"
      clear-icon="mdi-close-circle-outline"
    ></v-text-field>
    <v-btn color="primary" elevation="0" @click.prevent="$emit('roleToAdd')" class="ml-3">
      <v-icon left>mdi-briefcase-plus</v-icon>
      Add Role
    </v-btn>
  </div>
</template>

<script>
export default {
  data: () => ({
    searchPhrase: '',
  }),
  watch: {
    searchPhrase() {
      this.$emit('updateSearch', this.searchPhrase);
    },
  },
};
</script>

<style></style>

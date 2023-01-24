<template>
  <v-text-field
    v-model="searchPhrase"
    placeholder="Search User"
    hide-details
    prepend-inner-icon="mdi-magnify"
    clearable
    solo
    dense
    flat
    background-color="grey lighten-4"
    clear-icon="mdi-close-circle-outline"
  ></v-text-field>
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

<template>
  <v-toolbar color="white" elevation="0">
    <v-toolbar-title class="text-center">
      <h4>
        Share Process
        <span class="grey--text text-subtitle-1 font-weight-bold">({{ process.name }})</span>
      </h4>
    </v-toolbar-title>
    <v-progress-linear
      :active="loading"
      :indeterminate="loading"
      absolute
      top
      color="primary"
    ></v-progress-linear>
    <v-spacer></v-spacer>
    <!-- <v-btn icon>
      <v-icon>mdi-close</v-icon>
    </v-btn> -->
  </v-toolbar>
</template>

<script>
export default {
  props: {
    loading: {
      type: Boolean,
      required: true,
    },
    process: {
      type: Object,
      required: true,
    },
  },
};
</script>

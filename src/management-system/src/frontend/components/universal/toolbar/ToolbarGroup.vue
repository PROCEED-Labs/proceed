<template>
  <v-col style="padding-bottom: 0" md="auto">
    <v-toolbar rounded floating dense> <slot></slot> </v-toolbar>
  </v-col>
</template>
<script>
export default {
  name: 'toolbar-group',
};
</script>

<template>
  <v-container :style="style" fluid>
    <v-row :justify="justify"> <slot></slot> </v-row>
  </v-container>
</template>
<script>
export default {
  props: {
    top: {
      type: String,
    },
    bottom: {
      type: String,
    },
    justify: {
      type: String,
    },
  },

  computed: {
    style() {
      if (this.top && this.bottom) {
        throw new Error(
          'You should only define one of top and bottom offset for hovering toolbars',
        );
      }

      if (this.top) {
        return `top: ${this.top}`;
      }

      if (this.bottom) {
        return `bottom: ${this.bottom}`;
      }

      return '';
    },
  },
};
</script>
<style scoped>
.container {
  position: absolute;
  z-index: 2;
  padding: 12px;
  align-items: baseline;
}
</style>

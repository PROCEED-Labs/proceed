<template>
  <v-tooltip v-bind="tooltipAttrs">
    <template v-slot:activator="{ on }">
      <span v-on="on">
        <v-btn icon v-on="listeners" v-bind="attrs">
          <slot name="button-content">
            <v-icon>
              <slot></slot>
            </v-icon>
          </slot>
        </v-btn>
      </span>
    </template>
    <span><slot name="tooltip-text"></slot></span>
  </v-tooltip>
</template>
<script>
export default {
  name: 'tooltip-button',
  // prevent the attributes to be passed to the root tooltip element
  inheritAttrs: false,
  computed: {
    listeners() {
      return { ...this.$listeners };
    },
    attrs() {
      const defaultAttrs = { color: 'black' };
      const { top, left, right, bottom, ...attrs } = this.$attrs;
      return { ...defaultAttrs, ...attrs };
    },
    tooltipAttrs() {
      const { top, left, right, bottom } = this.$attrs;

      if (top === undefined && left === undefined && right === undefined && bottom === undefined) {
        return { bottom: true };
      }

      return { top, left, right, bottom };
    },
  },
};
</script>

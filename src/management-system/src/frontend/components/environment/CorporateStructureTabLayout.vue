<template>
  <v-card flat>
    <slot name="form"></slot>
    <v-card-title class="justify-end">
      <v-btn color="primary" @click="createItem">Add {{ title }}</v-btn>
    </v-card-title>
    <v-card-text>
      <slot name="table"></slot>
    </v-card-text>
  </v-card>
</template>

<script>
export default {
  components: {},
  props: {
    title: {
      type: String,
      required: true,
    },
  },
  data: () => ({
    search: '',
  }),

  computed: {},

  methods: {
    createItem() {
      this.$emit('create');
    },
  },
};
</script>
<style lang="scss" scoped></style>

<template>
  <v-list dense nav class="pt-2 px-0">
    <v-list-item-group color="primary">
      <v-list-item
        v-for="(role, index) in roles"
        :key="role.id"
        :index="index"
        class="px-4 active mb-2"
        :class="
          role.id === selectedRole.id
            ? 'v-item--active v-list-item--active v-list-item--link theme--light active'
            : ''
        "
        @click.prevent="$emit('roleSelected', role)"
      >
        <v-list-item-content>
          <v-list-item-title class="text-left">{{ role.name }}</v-list-item-title>
        </v-list-item-content>
      </v-list-item>
    </v-list-item-group>
  </v-list>
</template>

<script>
export default {
  props: {
    roles: {
      type: Array,
      required: true,
    },
    selectedRole: {
      type: Object,
      required: true,
    },
  },
};
</script>

<style></style>

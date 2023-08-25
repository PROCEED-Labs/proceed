<template>
  <div>
    <v-list-item
      :disabled="role.default || missingAdminPermissions"
      link
      @click.prevent="$emit('roleToDelete')"
    >
      <v-list-item-icon>
        <v-icon color="error">mdi-delete</v-icon>
      </v-list-item-icon>
      <v-list-item-title>Delete Role</v-list-item-title>
    </v-list-item>
  </div>
</template>

<script>
import { PERMISSION_ADMIN } from '@/shared-frontend-backend/constants';

export default {
  props: {
    role: {
      type: Object,
      required: true,
    },
  },
  computed: {
    missingAdminPermissions() {
      return Object.keys(this.role.permissions).some(
        (resource) =>
          this.role.permissions[resource] === PERMISSION_ADMIN && !this.$can('admin', resource),
      );
    },
  },
};
</script>

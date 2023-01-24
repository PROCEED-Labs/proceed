<template>
  <div class="d-flex mt-6">
    <v-text-field
      v-model="searchPhrase"
      placeholder="Search Member"
      hide-details
      prepend-inner-icon="mdi-magnify"
      clearable
      solo
      dense
      flat
      background-color="grey lighten-4"
      clear-icon="mdi-close-circle-outline"
    ></v-text-field>
    <v-btn
      v-if="canManageMembers"
      color="primary"
      elevation="0"
      @click.prevent="$emit('membersToAdd')"
      class="ml-3"
      :disabled="!canManageMembers"
    >
      <v-icon left>mdi-account-plus</v-icon>
      Add Member
    </v-btn>
    <v-tooltip left color="error" v-else nudge-right="8">
      <template v-slot:activator="{ on, attrs }">
        <div v-bind="attrs" v-on="on">
          <v-btn
            color="primary"
            elevation="0"
            @click.prevent="$emit('membersToAdd')"
            class="ml-3"
            :disabled="!canManageMembers"
          >
            <v-icon left>mdi-account-plus</v-icon>
            Add Member
          </v-btn>
        </div>
      </template>
      <span>{{ getDenyMessage }}</span>
    </v-tooltip>
  </div>
</template>

<script>
export default {
  props: {
    selectedRole: {
      type: Object,
      required: true,
    },
    permissions: {
      type: Object,
      required: true,
    },
    missingAdminPermissions: {
      type: Array,
      required: true,
    },
  },
  data: () => ({
    searchPhrase: '',
    show: false,
  }),
  watch: {
    searchPhrase() {
      this.$emit('updateSearch', this.searchPhrase);
    },
  },
  computed: {
    canManageMembers() {
      if (this.selectedRole) {
        if (this.selectedRole.name === '@admin') return this.$can('admin', 'All');
        if (!this.$can('manage-roles', 'User')) return false;
        if (this.missingAdminPermissions.length > 0) return false;
        return true;
      }
      return false;
    },
    getDenyMessage() {
      if (this.selectedRole) {
        if (!this.$can('manage-roles', 'User'))
          return 'Missing permissions to manage roles of users';
        return `Missing admin permissions for ${this.missingAdminPermissions.join(', ')}`;
      }
      return '';
    },
  },
};
</script>

<style></style>

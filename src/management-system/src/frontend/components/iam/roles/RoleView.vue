<template>
  <div>
    <RolesHeader />
    <DefaultPermissions :roles.sync="roles" @roleSelected="$emit('roleSelected', $event)" />
    <SearchBarCombo
      @updateSearch="$emit('updateSearch', $event)"
      @roleToAdd="$emit('roleToAdd')"
      class="mt-4"
    />
    <RolesTable
      :roles.sync="filteredRoles"
      :permissions="permissions"
      @roleSelected="$emit('roleSelected', $event)"
      @roleToDelete="$emit('roleToDelete', $event)"
      @roleToEdit="$emit('roleToEdit', $event)"
      @membersToView="$emit('membersToView', $event)"
    />
  </div>
</template>

<script>
import RolesHeader from '@/frontend/components/iam/roles/RolesHeader.vue';
import DefaultPermissions from '@/frontend/components/iam/roles/DefaultPermissions.vue';
import SearchBarCombo from '@/frontend/components/iam/roles/SearchBarCombo.vue';
import RolesTable from '@/frontend/components/iam/roles/RolesTable.vue';

export default {
  components: {
    RolesHeader,
    DefaultPermissions,
    SearchBarCombo,
    RolesTable,
  },
  props: {
    roles: {
      type: Array,
      required: true,
    },
    search: {
      type: String,
      default: null,
    },
    permissions: {
      type: Object,
      required: true,
    },
  },
  computed: {
    filteredRoles() {
      if (!this.search) return this.roles;
      return this.roles.filter((role) => {
        return role.name.toLowerCase().match(this.search.toLowerCase());
      });
    },
  },
};
</script>

<style></style>

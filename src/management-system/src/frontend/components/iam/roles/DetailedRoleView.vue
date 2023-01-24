<template>
  <div class="d-flex" style="width: 100%" v-if="detailedRoleView">
    <v-col cols="3" class="pa-4" v-if="detailedRoleView">
      <v-btn :ripple="false" text color="primary" class="pl-2" @click.prevent="$emit('back')">
        <v-icon class="mr-2">mdi-chevron-left</v-icon>
        Back
      </v-btn>
      <SearchBarCombo
        @updateSearch="$emit('updateSearch', $event)"
        @roleToAdd="$emit('roleToAdd')"
      />
      <RolesList
        :roles.sync="filteredRoles"
        :selectedRole="selectedRole"
        @roleSelected="$emit('roleSelected', $event)"
      />
    </v-col>
    <v-divider vertical v-if="detailedRoleView"></v-divider>
    <v-col cols="9" class="pa-4" v-if="detailedRoleView">
      <div class="d-flex">
        <div class="d-flex align-center">
          <h3 class="text-h6 mb-1">Manage role - {{ selectedRole.name }}</h3>
        </div>
        <div style="position: absolute; right: 0" class="pr-4">
          <v-tooltip
            left
            color="error"
            nudge-right="10"
            :disabled="
              $can('delete', 'Role') &&
              missingAdminPermissions.length === 0 &&
              !selectedRole.default
            "
          >
            <template v-slot:activator="{ on, attrs }">
              <div v-bind="attrs" v-on="on">
                <v-menu offset-y transition="scale-transition" origin="center center" left>
                  <template v-slot:activator="{ on, attrs }">
                    <v-btn
                      icon
                      v-bind="attrs"
                      v-on="on"
                      :disabled="
                        !$can('delete', 'Role') ||
                        missingAdminPermissions.length > 0 ||
                        selectedRole.default
                      "
                    >
                      <v-icon>mdi-dots-vertical</v-icon>
                    </v-btn>
                  </template>
                  <v-list>
                    <DeleteRoleButton :role="selectedRole" @roleToDelete="$emit('roleToDelete')" />
                  </v-list>
                </v-menu>
              </div>
            </template>
            <span>{{ getDenyMessage }}</span>
          </v-tooltip>
        </div>
      </div>
      <RolesTabs
        :resources="resources"
        :users="users"
        :selectedRole.sync="selectedRole"
        :copyOfSelectedRole.sync="copyOfSelectedRole"
        :changes.sync="changes"
        :tabInput="tabInput"
        :missingAdminPermissions="missingAdminPermissions"
        :getDenyMessage="getDenyMessage"
        :unmodifiedRoleState.sync="unmodifiedRoleState"
        :permissions.sync="permissions"
        :roles.sync="roles"
        @membersToAdd="$emit('membersToAdd')"
        @memberToRemove="$emit('memberToRemove', $event)"
        @memberRemoved="$emit('memberRemoved', $event)"
      />
    </v-col>
  </div>
</template>

<script>
import RolesTabs from '@/frontend/components/iam/roles/RolesTabs.vue';
import DeleteRoleButton from '@/frontend/components/iam/roles/DeleteRoleButton.vue';
import SearchBarCombo from '@/frontend/components/iam/roles/SearchBarCombo.vue';
import RolesList from '@/frontend/components/iam/roles/RolesList.vue';

export default {
  components: {
    DeleteRoleButton,
    RolesTabs,
    SearchBarCombo,
    RolesList,
  },
  props: {
    resources: {
      type: Array,
      required: true,
    },
    users: {
      type: Array,
      required: true,
    },
    selectedRole: {
      type: Object,
      required: true,
    },
    copyOfSelectedRole: {
      type: Object,
      required: true,
    },
    permissions: {
      type: Object,
      required: true,
    },
    changes: {
      type: Array,
      required: true,
    },
    unmodifiedRoleState: {
      type: Array,
      required: true,
    },
    roles: {
      type: Array,
      required: true,
    },
    tabInput: {
      type: Number,
    },
    detailedRoleView: {
      type: Boolean,
      required: true,
    },
    search: {
      type: String,
      default: null,
    },
  },
  computed: {
    filteredRoles() {
      if (!this.search)
        return this.roles
          .slice()
          .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
      return this.roles
        .filter((role) => {
          return role.name.toLowerCase().match(this.search.toLowerCase());
        })
        .slice()
        .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
    },
    missingAdminPermissions() {
      const resources = [];
      Object.keys(this.permissions).forEach((key) => {
        if (this.permissions[key].includes('admin') && !this.$can('admin', key))
          resources.push(key);
      });
      return resources;
    },
    getDenyMessage() {
      if (this.selectedRole) {
        if (this.selectedRole.default) return `Not allowed for default roles`;
        if (this.missingAdminPermissions.length > 0)
          return `Missing admin permissions for ${this.missingAdminPermissions.join(', ')}`;
      }
      return '';
    },
  },
};
</script>

<style></style>

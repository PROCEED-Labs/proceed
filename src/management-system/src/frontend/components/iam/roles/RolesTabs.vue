<template v-slot:extension>
  <v-tabs v-model="tab">
    <v-tab :ripple="false" class="text-capitalize px-0 mr-4">General Data</v-tab>
    <v-tab :ripple="false" class="text-capitalize px-0 mr-4">Permissions</v-tab>
    <v-tooltip
      :disabled="!['@everyone', '@guest'].includes(selectedRole.name)"
      bottom
      color="error"
      nudge-bottom="-15"
    >
      <template v-slot:activator="{ on, attrs }">
        <div class="d-flex" v-bind="attrs" v-on="on">
          <v-tab
            :ripple="false"
            class="text-capitalize px-0"
            :disabled="['@everyone', '@guest'].includes(selectedRole.name)"
          >
            Manage members ({{ selectedRole.members.length }})
          </v-tab>
        </div>
      </template>
      <span>Not available for global roles</span>
    </v-tooltip>
    <v-tab-item transition="none" reverse-transition="none">
      <GeneralData
        :selectedRole.sync="selectedRole"
        :copyOfSelectedRole="copyOfSelectedRole"
        :changes.sync="changes"
        :unmodifiedRoleState.sync="unmodifiedRoleState"
        :missingAdminPermissions="missingAdminPermissions"
        :getDenyMessage="getDenyMessage"
      />
    </v-tab-item>
    <v-tab-item transition="none" reverse-transition="none">
      <Permissions
        :selectedRole.sync="selectedRole"
        :copyOfSelectedRole.sync="copyOfSelectedRole"
        :changes.sync="changes"
        :resources="resources"
        :unmodifiedRoleState.sync="unmodifiedRoleState"
        :permissions.sync="permissions"
        :missingAdminPermissions="missingAdminPermissions"
        :getDenyMessage="getDenyMessage"
      />
    </v-tab-item>
    <v-tab-item
      transition="none"
      reverse-transition="none"
      v-if="!['@everyone', '@guest'].includes(selectedRole.name)"
    >
      <SearchMembers
        @membersToAdd="$emit('membersToAdd')"
        @updateSearch="search = $event"
        :selectedRole="selectedRole"
        :missingAdminPermissions="missingAdminPermissions"
        :permissions="permissions"
      />
      <MembersTable
        :users="users"
        :selectedRole="selectedRole"
        :search="search"
        :missingAdminPermissions="missingAdminPermissions"
        @memberToRemove="$emit('memberToRemove', $event)"
      />
    </v-tab-item>
  </v-tabs>
</template>

<script>
import Permissions from '@/frontend/components/iam/roles/Permissions.vue';
import GeneralData from '@/frontend/components/iam/roles/GeneralData.vue';
import SearchMembers from '@/frontend/components/iam/roles/SearchMembers.vue';
import MembersTable from '@/frontend/components/iam/roles/MembersTable.vue';
import { deepEquals } from '../../../helpers/helpers.js';

export default {
  components: { Permissions, GeneralData, MembersTable, SearchMembers },
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
    getDenyMessage: {
      type: String,
      required: true,
    },
    missingAdminPermissions: {
      type: Array,
      required: true,
    },
  },
  data() {
    return {
      tab: this.tabInput || null,
      search: '',
    };
  },
  watch: {
    selectedRole: {
      handler(value) {
        if (value.members.length < this.copyOfSelectedRole.members.length) {
          // if deleted user is detected
          this.$emit('memberRemoved', value);
          const unmodifiedIndex = this.unmodifiedRoleState.findIndex(
            (role) => role.id === this.selectedRole.id
          );
          if (unmodifiedIndex > -1) {
            this.unmodifiedRoleState[unmodifiedIndex].members = this.copyOfSelectedRole.members;
          }
          const changedIndex = this.changes.findIndex((role) => role.id === this.selectedRole.id);
          if (changedIndex > -1) {
            this.changedIndex[changedIndex].members = this.copyOfSelectedRole.members;
          }
        } else {
          const index = this.changes.findIndex(
            (changedRole) => changedRole.id === this.selectedRole.id
          );
          if (index < 0) {
            if (!deepEquals(this.copyOfSelectedRole, value)) {
              this.changes.push(this.selectedRole);
              this.unmodifiedRoleState.push(this.copyOfSelectedRole);
            }
          } else {
            if (deepEquals(this.copyOfSelectedRole, this.changes[index])) {
              this.changes.splice(index, 1);
              const unmodifiedIndex = this.unmodifiedRoleState.findIndex(
                (unmodifiedRole) => unmodifiedRole.id === this.selectedRole.id
              );
              this.unmodifiedRoleState.splice(unmodifiedIndex, 1);
            }
          }
        }
      },
      deep: true,
    },
  },
};
</script>

<style>
.v-tab:before {
  background-color: transparent !important;
}
</style>

<template>
  <div
    class="d-flex justify-center mb-5"
    style="position: fixed; bottom: 0px; left: 0; right: 0; z-index: 9999; pointer-events: none"
  >
    <v-alert
      text
      dense
      color="blue"
      icon="mdi-information-outline"
      style="width: 40%; z-index: 9999; background: aliceblue !important; pointer-events: auto"
      class="px-4 py-3"
      transition="scale-transition"
      :value="changes.length > 0"
    >
      <div class="d-flex justify-space-between align-center">
        <div>
          <v-list-item-title class="font-weight-bold text-left">
            Pending Changes
          </v-list-item-title>
          There are changes in {{ changes.length }}
          {{ changes.length > 1 ? 'roles' : 'role' }} pending.
        </div>
        <div>
          <v-btn text color="primary" @click.prevent="cancelChanges"> Cancel </v-btn>
          <v-btn color="primary" @click.prevent="updateRoles"> Save </v-btn>
        </div>
      </div>
    </v-alert>
  </div>
</template>

<script>
import { iamInterface as api } from '@/frontend/backend-api/index.js';
import { mergeIntoObject } from '@/frontend/helpers/helpers.js';

export default {
  props: {
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
    copyOfSelectedRole: {
      type: Object,
      required: true,
    },
  },
  methods: {
    async updateRoles() {
      this.changes.forEach(async (role) => {
        try {
          const updatedRole = JSON.parse(JSON.stringify(role));
          if (updatedRole.members) delete updatedRole.members;
          await api.updateRoleById(updatedRole.id, updatedRole);
          await mergeIntoObject(this.copyOfSelectedRole, role, true);
          const index = this.changes.findIndex((changedRole) => changedRole.id === role.id);
          if (index > -1) this.changes.splice(index, 1);
          const unmodifiedIndex = this.unmodifiedRoleState.findIndex(
            (unmodifiedRole) => unmodifiedRole.id === role.id
          );
          if (unmodifiedIndex > -1) this.unmodifiedRoleState.splice(index, 1);
        } catch (e) {}
      });
    },
    async cancelChanges() {
      let unmodifiedIndex = 0;
      this.unmodifiedRoleState.forEach(async (unmodifiedRole) => {
        const index = this.roles.findIndex((role) => role.id === unmodifiedRole.id);
        if (index > -1) {
          await mergeIntoObject(this.roles[index], unmodifiedRole, true);
          this.unmodifiedRoleState.splice(unmodifiedIndex, 1);
        }
        unmodifiedIndex++;
      });
      this.$emit('clearChanges');
    },
  },
};
</script>

<style></style>

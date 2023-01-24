<template>
  <v-data-table
    :headers="headers"
    hide-default-header
    :items="filteredMembers"
    :items-per-page="5"
    sort-by="name"
    loading-text="Loading... Please wait"
    :no-data-text="search ? 'No matching members' : 'No members'"
    class="mt-6"
  >
    <template v-slot:item.name="{ item }">
      <div class="d-flex align-center">
        <v-avatar class="mx-n2">
          <img :src="gravatar(item)" :alt="item.username" class="pa-2" />
        </v-avatar>
        <span class="d-flex align-center font-weight-medium ml-3"
          >{{ item.firstName + ' ' + item.lastName }}
          <span class="font-weight-regular">&nbsp;({{ item.username }})</span>
        </span>
      </div>
    </template>
    <template v-slot:item.actions="{ item }">
      <v-tooltip left :color="!canManageMembers ? 'error' : ''">
        <template v-slot:activator="{ on, attrs }">
          <span v-bind="attrs" v-on="on">
            <v-btn
              icon
              @click.prevent="$emit('memberToRemove', item)"
              :disabled="!canManageMembers"
            >
              <v-icon>mdi-close-circle-outline</v-icon>
            </v-btn>
          </span>
        </template>
        <span>{{ !canManageMembers ? getDenyMessage : 'Remove Member' }}</span>
      </v-tooltip>
    </template>
  </v-data-table>
</template>

<script>
import md5 from 'js-md5';

export default {
  props: {
    selectedRole: {
      type: Object,
      required: true,
    },
    missingAdminPermissions: {
      type: Array,
      required: true,
    },
    search: {
      type: String,
    },
  },
  data() {
    return {
      headers: [
        {
          text: 'Name',
          align: 'start',
          sortable: true,
          value: 'name',
        },
        { text: '', value: 'actions', align: 'end', sortable: false },
      ],
    };
  },
  computed: {
    filteredMembers() {
      if (this.selectedRole.hasOwnProperty('id')) {
        if (!this.search) return this.selectedRole.members;
        return this.selectedRole.members.filter((user) => {
          return (
            user.email.toLowerCase().includes(this.search.toLowerCase()) ||
            user.username.toLowerCase().includes(this.search.toLowerCase()) ||
            `${user.firstName} ${user.lastName}`.toLowerCase().includes(this.search.toLowerCase())
          );
        });
      }
      return [];
    },
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
  methods: {
    gravatar(user) {
      const hash = md5(user.email.trim().toLowerCase());
      return `https://www.gravatar.com/avatar/${hash}`;
    },
  },
};
</script>

<style></style>

<template>
  <div style="height: 100vh" class="d-flex flex-column">
    <ToolBar />
    <!-- <GroupTreeView
      v-if="$can('view', 'Group')"
      :items="groups"
      @selected="refreshUsers"
      @editGroup="setGroupInEditing"
      :activeGroup="activeGroup"
      ref="groupTreeView"
    /> -->
    <!-- <div class="d-flex fill-height">
      <v-progress-circular :size="50" color="primary" indeterminate></v-progress-circular>
    </div> -->
    <NoConnection style="width: 100%" v-if="!hasConnection" />
    <div class="fill-height" style="overflow-y: auto">
      <Loader v-if="loadingUsers && loadingRoles" />
      <UserTable
        :users.sync="users"
        @userDeleted="removeUserFromMembers"
        v-if="!loadingUsers && hasConnection && $can('manage', 'User')"
        :loading="loadingUsers"
      />
      <Roles
        :roles.sync="roles"
        :users.sync="users"
        v-if="
          !loadingRoles && hasConnection && ($can('manage', 'Role') || $can('manage-roles', 'User'))
        "
      />
    </div>
  </div>
</template>

<script>
import ToolBar from '@/frontend/components/iam/ToolBar.vue';
import UserTable from '@/frontend/components/iam/user-table/UserTable.vue';
import Roles from '@/frontend/components/iam/roles/Roles.vue';
import NoConnection from '@/frontend/components/iam/dialogs/NoConnection.vue';
import Loader from '@/frontend/components/iam/Loader.vue';
import { iamInterface as api } from '@/frontend/backend-api/index.js';

export default {
  name: 'IAM',
  components: {
    ToolBar,
    UserTable,
    NoConnection,
    Loader,
    Roles,
  },
  data: () => ({
    loadingUsers: true,
    loadingRoles: true,
    users: [],
    roles: [],
    hasConnection: true,
  }),
  async created() {
    await this.init();
  },
  methods: {
    async init() {
      await Promise.all([this.getAllUsers(), this.getAllRoles()]);
    },
    /**
     * receives all users from idp
     *
     * @returns {Array} - array containing all users
     */
    async getAllUsers() {
      if (this.$can('manage', 'User') || this.$can('manage-roles', 'User')) {
        try {
          const users = await api.getAllUsers();
          if (users.length > 0) {
            this.users = users;
            this.loadingUsers = false;
          } else {
            this.users = [];
          }
        } catch (error) {
          this.users = [];
          this.hasConnection = false;
          this.loadingUsers = false;
        }
      }
    },
    /**
     * receives all roles from ms server
     *
     * @returns {Array} - array containing all roles
     */
    async getAllRoles() {
      if (this.$can('manage', 'Role') || this.$can('manage-roles', 'User')) {
        try {
          const roles = await api.getRoles();
          if (roles.length > 0) {
            this.roles = roles;
            this.loadingRoles = false;
          } else {
            this.roles = [];
          }
        } catch (error) {
          this.roles = [];
          this.hasConnection = false;
          this.loadingRoles = false;
        }
      }
    },
    /**
     * removes a users as a member of a role, when user is deleted
     */
    removeUserFromMembers(userId) {
      this.roles.forEach((role) => {
        const index = role.members.findIndex((member) => member.userId === userId);
        if (index > -1) {
          role.members.splice(index, 1);
        }
      });
    },
  },
};
</script>

<style lang="scss" scoped>
.pre {
  white-space: pre;
}

.headline {
  margin: 0px;
}

.v-dialog {
  overflow: hidden !important;
}
</style>

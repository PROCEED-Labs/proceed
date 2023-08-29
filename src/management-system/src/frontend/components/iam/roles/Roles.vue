<template>
  <div>
    <v-container fluid>
      <v-row row wrap justify-center id="wrapper">
        <v-col>
          <v-card class="d-flex" style="width: 100%; min-height: 500px">
            <div class="d-flex flex-column pa-4" style="width: 100%" v-if="!detailedRoleView">
              <RoleView
                :roles.sync="roles"
                :search.sync="search"
                :permissions="permissions"
                @roleSelected="
                  setCopyOfSelectedRole($event);
                  search = '';
                  detailedRoleView = !detailedRoleView;
                  selectedRole = $event;
                  tabInput = $event.default ? 1 : 0;
                "
                @updateSearch="search = $event"
                @roleToAdd="addRoleDialog = true"
                @roleToDelete="
                  deleteRoleDialog = true;
                  roleToDelete = $event;
                "
                @roleToEdit="
                  selectedRole = $event;
                  detailedRoleView = !detailedRoleView;
                "
                @membersToView="
                  setCopyOfSelectedRole($event);
                  tabInput = 2;
                  detailedRoleView = !detailedRoleView;
                  selectedRole = $event;
                "
              />
            </div>
            <div class="d-flex" style="width: 100%" v-if="detailedRoleView">
              <DetailedRoleView
                :resources="resources"
                :users="users"
                :selectedRole.sync="selectedRole"
                :copyOfSelectedRole.sync="copyOfSelectedRole"
                :changes.sync="changes"
                :tabInput="tabInput"
                :unmodifiedRoleState.sync="unmodifiedRoleState"
                :permissions.sync="permissions"
                :roles.sync="roles"
                :detailedRoleView.sync="detailedRoleView"
                @roleToDelete="
                  deleteRoleDialog = true;
                  roleToDelete = selectedRole;
                "
                @membersToAdd="addMemberDialog = true"
                @memberToRemove="
                  removeMemberDialog = true;
                  memberToRemove = $event;
                "
                @memberRemoved="
                  setCopyOfSelectedRole($event);
                  selectedRole = $event;
                "
                @updateSearch="search = $event"
                @roleToAdd="addRoleDialog = true"
                @back="
                  detailedRoleView = !detailedRoleView;
                  tabInput = null;
                  search = '';
                "
                :search.sync="search"
                @roleSelected="
                  setCopyOfSelectedRole($event);
                  selectedRole = $event;
                "
              />
            </div>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
    <DeleteRoleDialog
      :role="roleToDelete"
      :roles.sync="roles"
      :deleteRoleDialog="deleteRoleDialog"
      @roleDeleted="removeRole"
      @cancel="
        deleteRoleDialog = false;
        roleToDelete = {};
      "
    />
    <AddRoleDialog
      :addRoleDialog="addRoleDialog"
      :roles.sync="roles"
      :resources="resources"
      @cancel="addRoleDialog = false"
      @roleAdded="
        $event !== null
          ? openPopup('Role successfully added', 'success')
          : openPopup('Something went wrong', 'error')
      "
    />
    <AddMemberDialog
      :selectedRole.sync="selectedRole"
      :addMemberDialog="addMemberDialog"
      :users.sync="users"
      :copyOfSelectedRole.sync="copyOfSelectedRole"
      @cancel="addMemberDialog = false"
    />
    <RemoveMemberDialog
      :selectedRole.sync="selectedRole"
      :removeMemberDialog="removeMemberDialog"
      :copyOfSelectedRole.sync="copyOfSelectedRole"
      :memberToRemove.sync="memberToRemove"
      @cancel="
        removeMemberDialog = false;
        memberToRemove = {};
      "
      @memberRemoved="removeMemberDialog = false"
    />
    <AlertWindow :popupData="alertData" />
    <PendingChanges
      :changes.sync="changes"
      :unmodifiedRoleState.sync="unmodifiedRoleState"
      :copyOfSelectedRole.sync="copyOfSelectedRole"
      :roles.sync="roles"
      @clearChanges="
        changes = [];
        setPermissions();
      "
    />
  </div>
</template>

<script>
import PendingChanges from '@/frontend/components/iam/dialogs/PendingChanges.vue';
import DetailedRoleView from '@/frontend/components/iam/roles/DetailedRoleView.vue';
import RoleView from '@/frontend/components/iam/roles/RoleView.vue';
import AddRoleDialog from '@/frontend/components/iam/dialogs/AddRoleDialog.vue';
import AddMemberDialog from '@/frontend/components/iam/dialogs/AddMemberDialog.vue';
import RemoveMemberDialog from '@/frontend/components/iam/dialogs/RemoveMemberDialog.vue';
import DeleteRoleDialog from '@/frontend/components/iam/dialogs/DeleteRoleDialog.vue';
import { translatePermissionToList } from '@/frontend/helpers/iam/permissions/permissions-handler.js';
import { iamInterface as api } from '@/frontend/backend-api/index.js';
import { alert } from '@/frontend/mixins/alert.js';
import AlertWindow from '@/frontend/components/universal/Alert.vue';

export default {
  components: {
    AddRoleDialog,
    AddMemberDialog,
    RemoveMemberDialog,
    AlertWindow,
    DeleteRoleDialog,
    PendingChanges,
    DetailedRoleView,
    RoleView,
  },
  props: {
    roles: {
      type: Array,
      required: true,
    },
    users: {
      type: Array,
      required: true,
    },
  },
  mixins: [alert],
  data() {
    return {
      search: '',
      detailedRoleView: false,
      addRoleDialog: false,
      addMemberDialog: false,
      deleteRoleDialog: false,
      removeMemberDialog: false,
      selectedRole: {},
      copyOfSelectedRole: {},
      roleToDelete: {},
      memberToRemove: {},
      resources: [],
      changes: [],
      unmodifiedRoleState: [],
      permissions: {},
      tabInput: null,
    };
  },
  async created() {
    await this.getResources();
    this.roles.forEach((role) => {
      const initialValue = {};
      const nulledPermissions = this.resources.reduce((obj, item) => {
        return {
          ...obj,
          [item['type']]: 0,
        };
      }, initialValue);
      role.permissions = { ...nulledPermissions, ...role.permissions };
    });
  },
  watch: {
    selectedRole() {
      this.setPermissions();
    },
  },
  methods: {
    async getResources() {
      try {
        const resources = await api.getResources();
        if (resources.length > 0) {
          this.resources = resources;
        }
      } catch (error) {
        this.resources = [];
      }
    },
    removeRole(role) {
      if (typeof role === 'object') {
        const index = this.roles.findIndex((singleRole) => singleRole.id === role.id);
        if (index > -1) {
          this.roles.splice(index, 1);
          delete this.permissions[role.name];
          if (this.detailedRoleView) {
            this.setCopyOfSelectedRole(this.roles[0]);
            this.selectedRole = this.roles[0];
          }
          this.openPopup('Role successfully deleted', 'success');
        } else {
          this.openPopup('Something went wrong', 'error');
        }
      }
      this.deleteRoleDialog = false;
    },
    setPermissions() {
      Object.keys(this.selectedRole.permissions).forEach(async (resource) => {
        this.$set(
          this.permissions,
          resource,
          await translatePermissionToList(this.selectedRole.permissions[resource]),
        );
      });
    },
    setCopyOfSelectedRole(role) {
      const index = this.unmodifiedRoleState.findIndex(
        (unmodifiedRole) => unmodifiedRole.id === role.id,
      );
      if (index > -1) {
        this.copyOfSelectedRole = JSON.parse(JSON.stringify(this.unmodifiedRoleState[index]));
      } else {
        this.copyOfSelectedRole = JSON.parse(JSON.stringify(role));
      }
    },
  },
};
</script>

<style></style>

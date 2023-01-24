<template>
  <div>
    <v-dialog
      v-model="addMemberDialog"
      max-width="400px"
      scrollable
      @keydown.esc="
        $emit('cancel');
        selectedUsers = [];
      "
      @click:outside="
        $emit('cancel');
        selectedUsers = [];
      "
    >
      <v-card>
        <v-card-title>
          <span class="headline mx-0">Add Members</span>
        </v-card-title>
        <v-card-text class="mt-4">
          <v-text-field
            class="mb-3"
            hide-details
            prepend-inner-icon="mdi-magnify"
            clearable
            solo
            dense
            flat
            background-color="grey lighten-4"
            clear-icon="mdi-close-circle-outline"
            placeholder="Search Members"
            v-model="search"
          >
          </v-text-field>

          <v-chip
            v-for="user in selectedUsers"
            :key="user.id"
            class="ml-0 mr-2 mb-3"
            label
            small
            close
            close-icon="mdi-close"
            style="z-index: 100"
            @click:close="removeSelectedUser(user)"
          >
            {{ user.username }}
          </v-chip>

          <template>
            <v-data-table
              hide-default-header
              hide-default-footer
              v-model="selectedUsers"
              :headers="headers"
              :items="filteredUsers"
              show-select
              @item-selected="addSelectedUser"
              :items-per-page="5"
            >
              <template v-slot:item.user="{ item }">
                <span class="font-weight-medium d-flex align-center">
                  <NameDisplay :user="item" />
                  <span class="font-weight-regular">&nbsp;({{ item.username }})</span>
                </span>
              </template>
            </v-data-table>
          </template>
          <div class="text-center mt-1" v-if="countRemainingUsers > 0">
            +{{ countRemainingUsers }} more
          </div>
          <v-card-actions class="px-0 pb-0 mt-2">
            <v-spacer></v-spacer>
            <v-btn
              class="text-end"
              @click.prevent="
                $emit('cancel');
                selectedUsers = [];
              "
            >
              Cancel
            </v-btn>
            <v-btn class="text-end" color="primary" @click.prevent="addMembers"> Add </v-btn>
          </v-card-actions>
        </v-card-text>
      </v-card>
    </v-dialog>
    <AlertWindow :popupData="alertData" />
  </div>
</template>

<script>
import { iamInterface as api } from '@/frontend/backend-api/index.js';
import AlertWindow from '@/frontend/components/universal/Alert.vue';
import { alert } from '@/frontend/mixins/alert.js';
import NameDisplay from '@/frontend/components/iam/user-table/NameDisplay.vue';

export default {
  components: {
    AlertWindow,
    NameDisplay,
  },
  props: {
    addMemberDialog: {
      type: Boolean,
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
    users: {
      type: Array,
      required: true,
    },
  },
  mixins: [alert],
  data: () => ({
    headers: [
      {
        text: 'User',
        align: 'start',
        sortable: false,
        value: 'user',
      },
    ],
    select: [],
    selectedUsers: [],
    search: '',
  }),
  computed: {
    filteredUsers() {
      if (this.selectedRole.hasOwnProperty('id')) {
        const filtered = this.users.filter(
          ({ id: id1, username }) =>
            !this.selectedRole.members.some(({ userId: id2 }) => id2 === id1) &&
            username !== 'admin'
        );
        if (!this.search) return filtered;
        return filtered.filter((user) => {
          return (
            user.email.toLowerCase().includes(this.search.toLowerCase()) ||
            user.username.toLowerCase().includes(this.search.toLowerCase()) ||
            `${user.firstName} ${user.lastName}`.toLowerCase().includes(this.search.toLowerCase())
          );
        });
      }
      return [];
    },
    countRemainingUsers() {
      if (!this.search) {
        return this.filteredUsers.length - this.filteredUsers.slice(0, 5).length;
      } else {
        if (this.selectedRole.admin) {
          return this.users.length - this.filteredUsers.length - this.selectedRole.members.length;
        } else {
          return (
            this.users.length - this.filteredUsers.length - this.selectedRole.members.length - 1
          );
        }
      }
    },
  },
  methods: {
    addSelectedUser(user) {
      if (user.value === false) {
        const index = this.selectedUsers.findIndex(
          (selectedUser) => selectedUser.id === user.item.id
        );
        if (index > -1) this.selectedUsers.splice(index, 1);
      } else {
        this.selectedUsers.push(user.item);
      }
    },
    removeSelectedUser(user) {
      const index = this.selectedUsers.findIndex((selectedUser) => selectedUser.id === user.id);
      if (index > -1) this.selectedUsers.splice(index, 1);
    },
    async addMembers() {
      const roleMappings = this.selectedUsers.map((selectedUser) => ({
        userId: selectedUser.id,
        username: selectedUser.username,
        firstName: selectedUser.firstName,
        lastName: selectedUser.lastName,
        email: selectedUser.email,
        roleId: this.selectedRole.id,
      }));
      try {
        await api.addRoleMappings(roleMappings);
        this.selectedUsers = [];
        roleMappings.forEach((mapping) => {
          const member = {
            userId: mapping.userId,
            username: mapping.username,
            firstName: mapping.firstName,
            lastName: mapping.lastName,
            email: mapping.email,
          };
          this.selectedRole.members.push(member);
          this.copyOfSelectedRole.members.push(member);
        });
      } catch (e) {
        console.log(e);
      }
    },
  },
};
</script>

<style scoped></style>

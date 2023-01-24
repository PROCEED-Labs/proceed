<template>
  <div class="mt-6">
    <v-data-table
      :headers="headers"
      :items="filterUsers"
      :items-per-page="5"
      sort-by="name"
      :loading="loading"
      loading-text="Loading... Please wait"
      :no-data-text="'No users available.'"
      no-results-text="No matching users found"
    >
      <template v-slot:item.name="{ item }">
        <NameDisplay :user="item" />
      </template>

      <template v-slot:item.email="{ item }">
        {{ item.email }}
      </template>

      <template v-slot:item.username="{ item }">
        {{ item.username }}
      </template>

      <template v-slot:item.actions="{ item }">
        <v-menu offset-y transition="scale-transition" origin="center center" left>
          <template v-slot:activator="{ on, attrs }">
            <v-btn icon v-bind="attrs" v-on="on">
              <v-icon>mdi-dots-vertical</v-icon>
            </v-btn>
          </template>
          <v-list>
            <!-- <EditUserButton
              @userToEdit="
                editUserDialog = true;
                user = item;
              "
            /> -->
            <DeleteUserButton
              @userToDelete="
                deleteUserDialog = true;
                user = item;
              "
            />
          </v-list>
        </v-menu>
      </template>
    </v-data-table>
    <DeleteUserDialog
      :user="user"
      :deleteUserDialog="deleteUserDialog"
      @cancel="
        deleteUserDialog = false;
        user = {};
      "
      @userDeleted="deleteUser"
    />
    <EditUserDialog
      :editUserDialog="editUserDialog"
      @cancel="editUserDialog = false"
      :user="user"
      v-if="editUserDialog"
    />
  </div>
</template>

<script>
import NameDisplay from '@/frontend/components/iam/user-table/NameDisplay.vue';
import DeleteUserButton from '@/frontend/components/iam/user-table/DeleteUserButton.vue';
import EditUserButton from '@/frontend/components/iam/user-table/EditUserButton.vue';
import headers from '@/frontend/helpers/iam/user-table-headers.js';
import DeleteUserDialog from '@/frontend/components/iam/dialogs/DeleteUserDialog.vue';
import EditUserDialog from '@/frontend/components/iam/dialogs/EditUserDialog.vue';

export default {
  components: {
    NameDisplay,
    DeleteUserDialog,
    DeleteUserButton,
    EditUserButton,
    EditUserDialog,
  },
  props: {
    users: {
      type: Array,
      required: true,
    },
    search: {
      type: String,
      default: '',
    },
    loading: {
      type: Boolean,
      required: true,
    },
  },
  data: () => ({
    headers,
    user: {},
    deleteUserDialog: false,
    editUserDialog: false,
  }),
  computed: {
    deleteUserConfirmationTitle() {
      return `delete the selected user?`;
    },
    filterUsers() {
      // filter users according to search phrase
      if (!this.search) return this.users.filter((user) => user.username !== 'admin');
      return this.users.filter((user) => {
        return (
          user.username !== 'admin' &&
          (user.email.toLowerCase().includes(this.search.toLowerCase()) ||
            user.username.toLowerCase().includes(this.search.toLowerCase()) ||
            `${user.firstName} ${user.lastName}`.toLowerCase().includes(this.search.toLowerCase()))
        );
      });
    },
  },
  methods: {
    deleteUser(userId) {
      const index = this.users.findIndex((user) => user.id === userId);
      this.users.splice(index, 1);
      this.deleteUserDialog = false;
      this.user = {};
      this.$emit('userDeleted', userId);
    },
  },
};
</script>

<style></style>

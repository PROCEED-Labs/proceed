<template>
  <v-container fluid>
    <v-row row wrap justify-center id="wrapper">
      <v-col>
        <v-card class="d-flex flex-column px-4">
          <h2 class="text-h6 pt-4">Users</h2>
          <p>Manage users and their roles, permissions &amp; groups.</p>
          <div class="d-flex">
            <SearchBar @updateSearch="search = $event" />
            <v-btn
              elevation="0"
              class="ml-3"
              color="primary"
              @click.prevent="addNewUserDialog = true"
            >
              <v-icon left>mdi-account-plus</v-icon>
              Add User
            </v-btn>
          </div>
          <UserTableContent
            :users.sync="users"
            :search.sync="search"
            @userDeleted="$emit('userDeleted', $event)"
            :loading="loading"
          />
        </v-card>
      </v-col>
    </v-row>
    <AddNewUserDialog
      :addNewUserDialog="addNewUserDialog"
      :users="users"
      @cancel="addNewUserDialog = false"
      @userAdded="addUser"
    />
  </v-container>
</template>

<script>
import UserTableContent from '@/frontend/components/iam/user-table/UserTableContent.vue';
import SearchBar from '@/frontend/components/iam/user-table/SearchBar.vue';
import AddNewUserDialog from '@/frontend/components/iam/dialogs/AddUserDialog.vue';

export default {
  components: { UserTableContent, SearchBar, AddNewUserDialog },
  props: {
    users: {
      type: Array,
      required: true,
    },
    loading: {
      type: Boolean,
      required: true,
    },
  },
  data: () => ({
    search: '',
    addNewUserDialog: false,
  }),
  methods: {
    setSearch(search) {
      this.search = search;
    },
    addUser(user) {
      this.users.push(user);
      this.addNewUserDialog = false;
    },
  },
};
</script>

<style></style>

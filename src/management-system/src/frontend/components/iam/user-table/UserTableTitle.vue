<template>
  <div>
    <v-card-title>
      <v-btn color="primary" @click.prevent="addNewUserDialog = true">
        <v-icon left>mdi-account-plus</v-icon>
        Add User
      </v-btn>
      <v-spacer></v-spacer>
      <v-text-field
        class="ma-0"
        append-icon="mdi-magnify"
        label="Search"
        single-line
        hide-details
        clearable
        v-model="search"
      ></v-text-field>
    </v-card-title>
    <AddNewUserDialog
      :addNewUserDialog="addNewUserDialog"
      :users="users"
      @cancel="addNewUserDialog = false"
      @userAdded="addUser"
    />
  </div>
</template>

<script>
import AddNewUserDialog from '@/frontend/components/iam/dialogs/AddUserDialog.vue';

export default {
  components: {
    AddNewUserDialog,
  },
  props: {
    users: {
      type: Array,
      required: true,
    },
  },
  data: () => ({
    search: '',
    addNewUserDialog: false,
  }),
  watch: {
    search() {
      this.$emit('typingSearch', this.search);
    },
  },
  methods: {
    addUser(user) {
      this.users.push(user);
      this.addNewUserDialog = false;
    },
  },
};
</script>

<style></style>

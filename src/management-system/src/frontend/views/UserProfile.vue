<template>
  <div>
    <v-toolbar>
      <v-toolbar-title>User Profile</v-toolbar-title>
      <v-spacer />
      <v-btn color="primary" @click.prevent="saveProfileData()">Save</v-btn>
    </v-toolbar>
    <v-container fluid>
      <v-row row wrap justify-center id="wrapper">
        <v-col>
          <v-card class="d-flex flex-column pa-4">
            <h2 class="text-h6">User Profile</h2>
            <p>Manage your profile data.</p>
            <ProfileData :user.sync="user" />
            <h2 class="text-h6 mt-4">Application Settings</h2>
            <p>Manage your application settings.</p>
            <SettingsList
              :settings="userConfig"
              :save="saveChanges"
              @valueChanged="commitChange($event)"
            />
            <h2 class="text-h6 mt-4">Danger Zone</h2>
            <p>Be careful when using funtions from the danger zone.</p>
            <DangerZone
              @userToDelete="deleteUserDialog = true"
              @passwordToChange="changePasswordDialog = true"
            />
          </v-card>
        </v-col>
      </v-row>
    </v-container>
    <DeleteUserDialog
      :user="getUser"
      :deleteUserDialog="deleteUserDialog"
      @cancel="deleteUserDialog = false"
      @userDeleted="deleteUser"
    />
    <ChangePasswordDialog
      :user="getUser"
      :changePasswordDialog="changePasswordDialog"
      @cancel="changePasswordDialog = false"
    />
    <AlertWindow :popupData="alertData" />
  </div>
</template>

<script>
import { alert } from '@/frontend/mixins/alert.js';
import AlertWindow from '@/frontend/components/universal/Alert.vue';
import SettingsList from '@/frontend/components/settings/SettingsList.vue';
import ProfileData from '@/frontend/components/user/ProfileData.vue';
import DangerZone from '@/frontend/components/user/DangerZone.vue';
import DeleteUserDialog from '@/frontend/components/iam/dialogs/DeleteUserDialog.vue';
import ChangePasswordDialog from '@/frontend/components/iam/dialogs/ChangePasswordDialog.vue';
import { mapGetters } from 'vuex';

export default {
  components: {
    SettingsList,
    ProfileData,
    DangerZone,
    DeleteUserDialog,
    ChangePasswordDialog,
    AlertWindow,
  },
  mixins: [alert],
  data() {
    return {
      saveChanges: false,
      user: {
        firstName: '',
        lastName: '',
        email: '',
        username: '',
      },
      deleteUserDialog: false,
      changePasswordDialog: false,
    };
  },
  computed: {
    userConfig() {
      return this.$store.getters['userPreferencesStore/getUserConfig'];
    },
    ...mapGetters({
      getUser: 'authStore/getUser',
    }),
  },
  created() {
    const { firstName, lastName, username, email } = this.getUser;
    this.user.firstName = firstName;
    this.user.lastName = lastName;
    this.user.username = username;
    this.user.email = email;
  },
  methods: {
    async saveProfileData() {
      try {
        await this.$store.dispatch('authStore/updateUser', this.user);
        this.saveChanges = true;
        this.openPopup('User successfully updated', 'success');
      } catch (e) {
        this.openPopup('Something went wrong', 'error');
        throw new Error(e.toString());
      }
    },
    deleteUser() {
      history.replaceState({}, document.title, '/#/');
      window.location.reload();
    },
    async commitChange(updatedValues) {
      await this.$store.dispatch('userPreferencesStore/updateUserConfig', updatedValues);
      this.saveChanges = false;
    },
  },
};
</script>

<style></style>

<template>
  <v-list dense nav class="pa-0">
    <v-tooltip right :disabled="isAuthenticated || authSectionOpen" color="rgba(30, 30, 30, 1)">
      <template v-slot:activator="{ on }">
        <v-list-group
          class="p-0 mb-0"
          v-on="on"
          @click.prevent="$emit('toggleAuthSection')"
          id="authGroupHeader"
        >
          <template v-slot:activator class="mb-0 rounded-0">
            <v-list-item two-line class="pa-0 mb-0">
              <v-badge
                bordered
                bottom
                color="green accent-3"
                dot
                offset-x="25"
                offset-y="25"
                :value="isAuthenticated"
              >
                <v-list-item-avatar class="ml-0">
                  <img
                    v-if="isAuthenticated && getUser.email"
                    :src="gravatar"
                    alt="user gravatar profile image"
                  />
                  <v-avatar color="blue-grey lighten-4" size="40" v-else
                    ><v-icon dark color="white"> mdi-account-circle </v-icon></v-avatar
                  >
                </v-list-item-avatar>
              </v-badge>
              <v-list-item-content>
                <v-list-item-title
                  v-if="isAuthenticated && getUser.firstName && getUser.lastName"
                  >{{ `${getUser.firstName} ${getUser.lastName}` }}</v-list-item-title
                >
                <v-list-item-title v-if="isAuthenticated && !getUser.firstName && getUser.username">
                  {{ getUser.username }}
                </v-list-item-title>
                <v-list-item-title v-if="!isAuthenticated">Guest User</v-list-item-title>
                <v-list-item-subtitle v-if="isAuthenticated">Online</v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
          </template>

          <v-list-item-group color="primary" class="px-2 mb-2">
            <v-list-item v-if="isAuthenticated" router to="/user-profile" class="px-2">
              <v-list-item-icon>
                <v-icon>mdi-account-settings</v-icon>
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title>User Profile</v-list-item-title>
              </v-list-item-content>
            </v-list-item>
            <v-list-item class="px-2" v-if="!isAuthenticated" @click.prevent="login">
              <v-list-item-icon>
                <v-icon>mdi-login</v-icon>
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title>Login</v-list-item-title>
              </v-list-item-content>
            </v-list-item>
            <v-list-item class="px-2" v-if="isAuthenticated" @click.prevent="logout">
              <v-list-item-icon>
                <v-icon>mdi-logout</v-icon>
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title>Logout</v-list-item-title>
              </v-list-item-content>
            </v-list-item>
            <v-list-item
              class="px-2"
              v-if="!isAuthenticated && $allowRegistrations"
              @click.prevent="register"
            >
              <v-list-item-icon>
                <v-icon>mdi-account-plus</v-icon>
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title>Register</v-list-item-title>
              </v-list-item-content>
            </v-list-item>
          </v-list-item-group>
        </v-list-group>
      </template>
      <span>Click to login or sign up.</span>
    </v-tooltip>
  </v-list>
</template>

<script>
import { mapGetters } from 'vuex';
import md5 from 'js-md5';
import { oauthClient } from '@/frontend/backend-api/index.js';

export default {
  props: ['authSectionOpen'],
  computed: {
    ...mapGetters({
      isAuthenticated: 'authStore/isAuthenticated',
      getUser: 'authStore/getUser',
    }),
    gravatar() {
      if (this.getUser && this.getUser.email) {
        const hash = md5(this.getUser.email.trim().toLowerCase());
        return `https://www.gravatar.com/avatar/${hash}`;
      } else {
        return '';
      }
    },
  },
  methods: {
    // starts the authorization code flow with pkce at the backend and redirects to authorization server
    login() {
      oauthClient.login();
    },
    // initiates a logout from the authorization server
    logout() {
      oauthClient.logout();
    },
    // initiates a registration and redirects to authorization Server
    register() {
      oauthClient.register();
    },
  },
};
</script>

<template>
  <div class="d-flex" v-if="getUser">
    <v-list-item-avatar>
      <v-hover v-slot="{ hover }">
        <v-btn
          v-if="hover"
          fab
          dark
          small
          :color="getColor + ' lighten-1'"
          @click.prevent="openEmailClient()"
        >
          <v-icon dark>mdi-email</v-icon>
        </v-btn>
        <v-avatar :color="getColor + ' lighten-1'" size="40" v-else>
          <span class="white--text text-h5">{{ getUser.firstName[0] }}</span>
        </v-avatar>
      </v-hover>
    </v-list-item-avatar>
    <v-tooltip left>
      <template v-slot:activator="{ on, attrs }">
        <v-list-item-content v-bind="attrs" v-on="getSharedBy.id !== getCurrentUser.id ? on : null">
          <v-list-item-title
            v-text="getUser.firstName + ' ' + getUser.lastName"
            class="text-left"
          ></v-list-item-title>
          <v-list-item-subtitle v-text="getUser.email" class="text-left"></v-list-item-subtitle>
        </v-list-item-content>
      </template>
      <span
        >Shared by
        {{ `${getSharedBy.firstName} ${getSharedBy.lastName} (${getSharedBy.username})` }}</span
      >
    </v-tooltip>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  props: {
    userId: {
      type: String,
      required: true,
    },
    users: {
      type: Array,
      required: true,
    },
    share: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      colors: [
        'red',
        'pink',
        'purple',
        'deep-purple',
        'indigo',
        'blue',
        'light-blue',
        'cyan',
        'teal',
        'green',
        'light-green',
        'lime',
        'yellow',
        'amber',
        'orange',
        'deep-orange',
        'brown',
        'grey',
        'blue-grey',
      ],
    };
  },
  computed: {
    ...mapGetters({
      getCurrentUser: 'authStore/getUser',
    }),
    getColor() {
      const index = this.getUser.firstName[0].toLowerCase().charCodeAt(0) - 97;
      if (index <= 18) {
        return this.colors[index];
      } else {
        return this.colors[index - 19];
      }
    },
    getUser() {
      return this.users.find((user) => user.id === this.userId);
    },
    getSharedBy() {
      return this.users.find((user) => user.id === this.share.sharedBy);
    },
  },
  methods: {
    openEmailClient() {
      if (window) {
        window.location.href = `mailto:${this.getUser.email}`;
      }
    },
  },
};
</script>

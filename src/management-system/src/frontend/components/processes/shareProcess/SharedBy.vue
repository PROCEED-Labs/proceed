<template>
  <v-list-item dense v-if="shares.length && getSharedBy">
    <v-list-item-avatar>
      <v-hover v-slot="{ hover }">
        <v-btn v-if="hover" fab dark small color="primary" @click.prevent="openEmailClient()">
          <v-icon dark>mdi-email</v-icon>
        </v-btn>
        <v-avatar color="primary" size="40" v-else>
          <span class="white--text text-h5">{{ getSharedBy.firstName[0] }}</span>
        </v-avatar>
      </v-hover>
    </v-list-item-avatar>
    <v-list-item-content>
      <v-list-item-title class="text-left"
        ><span>{{ `Shared by ${getSharedBy.firstName} ${getSharedBy.lastName} ` }}</span
        ><span class="grey--text">{{ `(${getSharedBy.username})` }}</span></v-list-item-title
      >
    </v-list-item-content>
  </v-list-item>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  props: {
    shares: {
      type: Array,
      required: true,
    },
    users: {
      type: Array,
      required: true,
    },
  },
  computed: {
    getSharedBy() {
      const share = this.shares.find((share) => share.sharedWith === this.getUser.id);
      if (share) return this.users.find((user) => user.id === share.sharedBy);
      return null;
    },
    ...mapGetters({
      getUser: 'authStore/getUser',
    }),
  },
  methods: {
    openEmailClient() {
      if (window) {
        window.location.href = `mailto:${this.getSharedBy.email}`;
      }
    },
  },
};
</script>

<template>
  <v-autocomplete
    :items="
      usersWithoutShare.filter(
        (user) => user.username !== 'admin' && user.id !== getUser.id && user.id !== process.owner,
      )
    "
    ref="autocomplete"
    placeholder="Add Name, Email ..."
    hide-details
    clearable
    solo
    dense
    flat
    :filter="onFilter"
    return-object
    background-color="grey lighten-4"
    clear-icon="mdi-close-circle-outline"
    @change="addUserSharing($event)"
    prepend-inner-icon="mdi-plus"
  >
    <template v-slot:item="{ item }">
      <template>
        <v-list-item-content>
          <v-list-item-title v-html="item.firstName + ' ' + item.lastName"></v-list-item-title>
          <v-list-item-subtitle v-html="item.email"></v-list-item-subtitle>
        </v-list-item-content>
      </template>
    </template>
    <template v-slot:selection="{ item }"></template>
  </v-autocomplete>
</template>

<script>
import { iamInterface as api } from '@/frontend/backend-api/index.js';
import { TYPE_USER, PERMISSION_VIEW } from '@/shared-frontend-backend/constants/index.js';
import { mapGetters } from 'vuex';

export default {
  props: {
    users: {
      type: Array,
      required: true,
    },
    usersWithoutShare: {
      type: Array,
      required: true,
    },
    shares: {
      type: Array,
      required: true,
    },
    process: {
      type: Object,
    },
  },
  data() {
    return {
      searchInput: null,
    };
  },
  computed: {
    ...mapGetters({
      getUser: 'authStore/getUser',
    }),
  },
  methods: {
    onFilter(item, queryText) {
      return (
        item.email.toLowerCase().includes(queryText.toLowerCase()) ||
        item.username.toLowerCase().includes(queryText.toLowerCase()) ||
        `${item.firstName} ${item.lastName}`.toLowerCase().includes(queryText.toLowerCase())
      );
    },
    async addUserSharing(user) {
      // necessary to remove content from autocomplete searchbar
      this.$nextTick(() => {
        this.searchString = '';
        this.searchResult = null;
      });
      this.$refs.autocomplete.blur();
      this.$refs.autocomplete.reset();
      const share = {
        permissions: PERMISSION_VIEW,
        resourceType: this.process.type[0].toUpperCase() + this.process.type.slice(1),
        resourceId: this.process.id,
        type: TYPE_USER,
        sharedWith: user.id,
      };
      try {
        const newShare = await api.addShare(share);
        if (newShare) {
          this.shares.push(newShare);
        }
      } catch (e) {
        throw new Error('Unable to add new share!');
      }
    },
  },
};
</script>

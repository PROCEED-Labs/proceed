<template>
  <v-card>
    <ShareProcessHeader :loading="loading" :process="expanded[0]" />
    <SharedBy :shares="shares" :users="users" v-if="isAuthenticated" />
    <v-container v-if="isAuthenticated">
      <SearchBar
        :users.sync="users"
        :usersWithoutShare.sync="usersWithoutShare"
        :shares.sync="shares"
        :process="expanded[0]"
      />
    </v-container>
    <v-container class="pt-1" v-if="isAuthenticated">
      <v-menu :close-on-content-click="false" bottom right offset-y>
        <template v-slot:activator="{ on, attrs }">
          <v-badge
            color="primary"
            :content="filter.length"
            overlap
            :value="filter.length ? true : false"
            ><v-btn v-bind="attrs" v-on="on" depressed>
              <v-icon class="mr-2">mdi-filter-variant</v-icon>Add Filter
            </v-btn></v-badge
          >
        </template>
        <v-card class="py-2" width="307">
          <v-list-item-group v-model="filter" color="primary" multiple>
            <v-list-item :value="TYPE_LINK">
              <template v-slot:default="{ active }">
                <v-list-item-action>
                  <v-checkbox :input-value="active"></v-checkbox>
                </v-list-item-action>
                <v-list-item-content>
                  <v-list-item-title>Links</v-list-item-title>
                </v-list-item-content>
              </template>
            </v-list-item>
            <v-list-item :value="TYPE_USER">
              <template v-slot:default="{ active }">
                <v-list-item-action>
                  <v-checkbox :input-value="active"></v-checkbox>
                </v-list-item-action>
                <v-list-item-content>
                  <v-list-item-title>User</v-list-item-title>
                </v-list-item-content>
              </template>
            </v-list-item>
          </v-list-item-group>
        </v-card>
      </v-menu>
    </v-container>
    <v-list subheader>
      <InternalLink :process="expanded[0]" v-if="isAuthenticated" />
      <!-- <LinkShareDefault v-if="!hasLinkShare" :shares.sync="shares" :process.sync="expanded[0]" /> -->
      <SharesList
        v-if="shares.length > 0"
        :process.sync="expanded[0]"
        :shares.sync="shares"
        :users.sync="users"
        :filter="filter"
      />
    </v-list>
  </v-card>
</template>

<script>
import { iamInterface as api } from '@/frontend/backend-api/index.js';
import ShareProcessHeader from '@/frontend/components/processes/shareProcess/ShareProcessHeader.vue';
import LinkShareDefault from '@/frontend/components/processes/shareProcess/LinkShareDefault.vue';
import SharedBy from '@/frontend/components/processes/shareProcess/SharedBy.vue';
import InternalLink from '@/frontend/components/processes/shareProcess/InternalLink.vue';
import SharesList from '@/frontend/components/processes/shareProcess/SharesList.vue';
import SearchBar from '@/frontend/components/processes/shareProcess/SearchBar.vue';
import { TYPE_USER, TYPE_LINK } from '@/shared-frontend-backend/constants/index.js';
import { mapGetters } from 'vuex';

export default {
  name: 'ShareProcessPanel',
  components: {
    ShareProcessHeader,
    LinkShareDefault,
    SharedBy,
    InternalLink,
    SharesList,
    SearchBar,
  },
  props: {
    expanded: {
      type: Array,
      required: true,
    },
  },
  data() {
    return {
      shares: [],
      users: [],
      searchResult: null,
      searchString: '',
      loading: true,
      filter: [],
      TYPE_USER,
      TYPE_LINK,
    };
  },
  async created() {
    await this.getAllUsers();
  },
  watch: {
    expanded: async function (val) {
      if (val.length) {
        await this.getShares(val[0]);
        this.loading = false;
      } else {
        this.shares = []; // reset shares
      }
    },
  },
  computed: {
    hasLinkShare() {
      return this.shares.some(
        (share) => share.hasOwnProperty('token') || share.hasOwnProperty('url'),
      );
    },
    ...mapGetters({
      isAuthenticated: 'authStore/isAuthenticated',
    }),
    usersWithoutShare() {
      const userIds = this.shares.map((share) => {
        if (share.type === TYPE_USER) return share.sharedWith;
      });
      return this.users.filter((user) => !userIds.includes(user.id));
    },
  },
  methods: {
    async getAllUsers() {
      if (this.isAuthenticated) {
        try {
          const users = await api.getAllUsers();
          if (users.length > 0) {
            this.users = users;
          }
        } catch (error) {
          this.users = [];
        }
      }
    },
    async getShares(resource) {
      try {
        const shares = await api.getShares(
          `resourceType=${resource.type[0].toUpperCase() + resource.type.slice(1)}&resourceId=${
            resource.id
          }`,
        );
        if (shares.length > 0) {
          this.shares = shares.sort((a, b) => (a.type < b.type ? 1 : b.type < a.type ? -1 : 0));
        } else {
          this.shares = [];
        }
      } catch (error) {
        throw new Error('Unable to fetch shares.');
      }
    },
  },
};
</script>

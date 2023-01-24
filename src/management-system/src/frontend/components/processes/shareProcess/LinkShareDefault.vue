<template>
  <v-list-item dense>
    <v-list-item-avatar>
      <v-icon class="red lighten-1" dark> mdi-link-variant </v-icon>
    </v-list-item-avatar>
    <v-list-item-content>
      <v-list-item-title v-text="'Share public link'" class="text-left"></v-list-item-title>
    </v-list-item-content>
    <v-list-item-action>
      <v-tooltip left>
        <template v-slot:activator="{ on, attrs }">
          <v-btn icon @click.prevent="addLinkShare" v-bind="attrs" v-on="on">
            <v-icon>mdi-plus</v-icon>
          </v-btn>
        </template>
        <span>Add link</span>
      </v-tooltip>
    </v-list-item-action>
  </v-list-item>
</template>

<script>
import { iamInterface as api } from '@/frontend/backend-api/index.js';
import { TYPE_LINK, PERMISSION_VIEW } from '@/shared-frontend-backend/constants/index.js';

export default {
  props: {
    process: {
      type: Object,
    },
    shares: {
      type: Array,
      required: true,
    },
  },
  methods: {
    async addLinkShare() {
      try {
        const share = {
          resourceType: this.process.type[0].toUpperCase() + this.process.type.slice(1),
          resourceId: this.process.id,
          permissions: PERMISSION_VIEW,
          type: TYPE_LINK,
        };
        const linkShare = await api.addShare(share);
        if (linkShare) {
          this.shares.splice(0, 0, linkShare);
        }
      } catch (e) {
        throw new Error(e.toString());
      }
    },
  },
};
</script>

<style scoped>
.white-bg {
  color: white !important;
}
</style>

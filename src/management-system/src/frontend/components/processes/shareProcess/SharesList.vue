<template>
  <div>
    <v-list-item v-for="(share, index) in filteredShares" :key="index" dense>
      <SingleSharing
        :share.sync="share"
        :process="process"
        :shares.sync="shares"
        :users.sync="users"
      />
    </v-list-item>
  </div>
</template>

<script>
import SingleSharing from '@/frontend/components/processes/shareProcess/sharesList/SingleSharing.vue';
import { mapGetters } from 'vuex';

export default {
  components: {
    SingleSharing,
  },
  props: {
    process: {
      type: Object,
    },
    shares: {
      type: Array,
      required: true,
    },
    users: {
      type: Array,
      required: true,
    },
    filter: {
      type: Array,
      required: true,
    },
  },
  computed: {
    filteredShares() {
      if (this.filter.length === 0) {
        return this.shares.filter((share) => share.sharedWith !== this.getUser.id);
      }
      return this.shares
        .filter((share) => this.filter.includes(share.type))
        .filter((share) => share.sharedWith !== this.getUser.id);
    },
    ...mapGetters({
      getUser: 'authStore/getUser',
    }),
  },
};
</script>

<template>
  <div>
    <v-dialog
      v-model="deleteUserDialog"
      max-width="500px"
      eager
      @click:outside="$emit('cancel')"
      @keydown.esc="$emit('cancel')"
    >
      <Confirmation
        :title="deleteUserConfirmationTitle"
        :continueButtonText="'Delete'"
        :show="deleteUserDialog"
        continueButtonColor="error"
        @cancel="$emit('cancel')"
        @continue="deleteUser(user)"
      >
        <div v-if="isSelf">You are about to remove your account. This cannot be undone!</div>
        <div v-else>
          You are about to remove the selected user <b>{{ user.username }}</b
          >!
        </div>
      </Confirmation>
    </v-dialog>
    <AlertWindow :popupData="alertData" />
  </div>
</template>

<script>
import Confirmation from '@/frontend/components/universal/Confirmation.vue';
import { iamInterface as api } from '@/frontend/backend-api/index.js';
import { alert } from '@/frontend/mixins/alert.js';
import AlertWindow from '@/frontend/components/universal/Alert.vue';
import { mapGetters } from 'vuex';

export default {
  components: { Confirmation, AlertWindow },
  mixins: [alert],
  props: {
    user: {
      type: [String, Object],
      required: true,
    },
    deleteUserDialog: {
      type: Boolean,
      required: true,
    },
  },
  computed: {
    deleteUserConfirmationTitle() {
      return this.isSelf ? `remove your account?` : `delete the selected user?`;
    },
    ...mapGetters({
      getUser: 'authStore/getUser',
    }),
    isSelf() {
      return this.getUser.id === this.user.id;
    },
  },
  methods: {
    // deletes user from authorization server
    async deleteUser(user) {
      const userId = user.id || user.user_id;
      try {
        const id = await api.deleteUser(userId);
        if (!this.isSelf && id) {
          this.openPopup('User successfully deleted', 'success');
        }
        this.$emit('userDeleted', userId);
      } catch (error) {
        this.openPopup('Something went wrong', 'error');
      }
    },
  },
};
</script>

<style></style>

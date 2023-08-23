<template>
  <div v-if="removeMemberDialog">
    <v-dialog
      :value="removeMemberDialog"
      max-width="500px"
      eager
      @click:outside="$emit('cancel')"
      @keydown.esc="$emit('cancel')"
    >
      <Confirmation
        :title="deleteRoleConfirmationTitle"
        :continueButtonText="'Remove'"
        :show="removeMemberDialog"
        continueButtonColor="error"
        @cancel="$emit('cancel')"
        @continue="removeMember"
      >
        <div>
          You are about to remove the selected user
          <b>{{ memberToRemove.firstName + ' ' + memberToRemove.lastName }} </b>({{
            memberToRemove.username
          }}) from the role <b>{{ selectedRole.name }}</b
          >!
        </div>
      </Confirmation>
    </v-dialog>
  </div>
</template>

<script>
import Confirmation from '@/frontend/components/universal/Confirmation.vue';
import { iamInterface as api } from '@/frontend/backend-api/index.js';

export default {
  components: {
    Confirmation,
  },
  props: {
    removeMemberDialog: {
      type: Boolean,
      required: true,
    },
    selectedRole: {
      type: Object,
      required: true,
    },
    memberToRemove: {
      type: Object,
      required: true,
    },
    copyOfSelectedRole: {
      type: Object,
      required: true,
    },
  },
  computed: {
    deleteRoleConfirmationTitle() {
      return `remove the selected user?`;
    },
  },
  methods: {
    async removeMember() {
      try {
        await api.deleteRoleMapping(this.memberToRemove.userId, this.selectedRole.id);
        let index = this.copyOfSelectedRole.members.findIndex(
          (member) => member.userId === this.memberToRemove.userId,
        );
        if (index > -1) {
          this.copyOfSelectedRole.members.splice(index, 1);
        }
        index = this.selectedRole.members.findIndex(
          (member) => member.userId === this.memberToRemove.userId,
        );
        if (index > -1) {
          this.selectedRole.members.splice(index, 1);
        }
        this.$emit('memberRemoved');
      } catch (e) {}
    },
  },
};
</script>

<style scoped></style>

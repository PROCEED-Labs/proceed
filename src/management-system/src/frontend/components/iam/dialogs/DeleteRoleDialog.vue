<template>
  <div v-if="deleteRoleDialog">
    <v-dialog
      :value="deleteRoleDialog"
      max-width="500px"
      eager
      @click:outside="$emit('cancel')"
      @keydown.esc="$emit('cancel')"
    >
      <Confirmation
        :title="deleteRoleConfirmationTitle"
        :continueButtonText="'Delete'"
        :show="deleteRoleDialog"
        continueButtonColor="error"
        @cancel="$emit('cancel')"
        @continue="deleteRole"
      >
        <div>
          You are about to remove the selected role <b>{{ role.name }}</b
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
  components: { Confirmation },
  props: {
    role: {
      type: Object,
      required: true,
    },
    deleteRoleDialog: {
      type: Boolean,
      required: true,
    },
    roles: {
      type: Array,
      required: true,
    },
  },
  computed: {
    deleteRoleConfirmationTitle() {
      return `delete the selected role?`;
    },
  },
  methods: {
    // deletes role from keycloak
    async deleteRole() {
      try {
        const role = this.roles.find((role) => role.id === this.role.id);
        if (role) {
          await api.deleteRoleById(role.id);
          this.$emit('roleDeleted', this.role);
        } else {
          this.$emit('roleDeleted', null);
        }
      } catch (error) {
        this.$emit('roleDeleted', null);
      }
    },
  },
};
</script>

<style></style>

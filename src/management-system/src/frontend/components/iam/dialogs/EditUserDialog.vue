<template>
  <div>
    <v-dialog
      v-model="editUserDialog"
      max-width="400px"
      scrollable
      @keydown.esc="$emit('cancel')"
      @click:outside="$emit('cancel')"
    >
      <v-card>
        <v-card-title class="px-4 pt-4">
          <v-avatar>
            <img :src="gravatar" :alt="user.firstName" />
          </v-avatar>
          <span class="ml-4">
            {{ user.firstName + ' ' + user.lastName + ' ' }}
            <span class="font-weight-light">({{ user.username }})</span>
          </span>
        </v-card-title>
        <v-card-text class="px-4">
          <v-combobox
            v-model="select"
            :items="roles"
            label="Roles"
            multiple
            chips
            class="mt-4"
            item-text="name"
            return-object
          >
            <template v-slot:selection="data">
              <v-chip
                :key="JSON.stringify(data.item)"
                color="grey lighten-4"
                class="ml-0 mr-2 black--text"
                label
                small
                close
                close-icon="mdi-close-circle-outline"
                v-bind="data.attrs"
                :input-value="data.selected.name"
                :disabled="data.disabled"
                @click:close="data.parent.selectItem(data.item)"
              >
                {{ data.item.name }}
              </v-chip>
            </template>
          </v-combobox>
          <div class="d-flex justify-space-between align-center">
            <p class="text-subtitle-1">Enabled</p>
            <v-switch inset dense class="ma-0 mr-n3" value="true"></v-switch>
          </div>
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <v-spacer></v-spacer>
          <v-btn class="text-end" @click.prevent="$emit('cancel')"> Cancel </v-btn>
          <v-btn class="text-end" color="primary" @click.prevent="saveSettings"> Save </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import md5 from 'js-md5';
import { iamInterface as api } from '@/frontend/backend-api/index.js';

export default {
  props: {
    editUserDialog: {
      type: Boolean,
      required: true,
    },
    user: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      select: [],
      userRoles: [],
      roles: [],
    };
  },
  computed: {
    gravatar() {
      if (this.user && this.user.email) {
        const hash = md5(this.user.email.trim().toLowerCase());
        return `https://www.gravatar.com/avatar/${hash}`;
      } else {
        return '';
      }
    },
  },
  async created() {
    try {
      const [roles, userRoles] = await Promise.all([
        api.getRoles(),
        api.getRolesFromUser(this.user.id),
      ]);
      if (roles && userRoles) {
        this.roles = roles.filter((role) => !role.guest && !role.default);
        this.userRoles = userRoles.map((role) => ({ ...role, name: role.roleName }));
        this.select = userRoles.map((role) => ({ ...role, name: role.roleName }));
      }
    } catch (e) {
      throw new Error('Unable to fetch roles!');
    }
  },
  methods: {
    async saveSettings() {
      try {
        const roles = this.select.filter(
          (role) => !this.userRoles.map((role) => role.name).includes(role.name)
        );

        console.log(roles);
        //await api.addRoleMappings({ userId: this.user.id, })
      } catch (e) {}
    },
  },
};
</script>

<style scoped></style>

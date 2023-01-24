<template>
  <div>
    <v-dialog
      :value="addRoleDialog"
      max-width="400px"
      scrollable
      @keydown.esc="
        $emit('cancel');
        reset();
      "
      @click:outside="
        $emit('cancel');
        reset();
      "
    >
      <v-card>
        <v-card-title>
          <span class="headline mx-0">New Role</span>
        </v-card-title>
        <v-card-text class="mt-3">
          <v-form ref="form" v-model="valid">
            <v-text-field
              tabindex="1"
              :autofocus="true"
              v-model="roleName"
              :counter="30"
              :rules="[...roleNameRules, sameNameRule]"
              label="Role Name*"
              required
              ref="firstName"
              @keydown.enter="createRole"
            ></v-text-field>
            <v-textarea
              :counter="255"
              tabindex="2"
              filled
              label="Description"
              :rules="descriptionRules"
              v-model="description"
            ></v-textarea>
            <v-menu
              v-model="menu"
              :value="date"
              :close-on-content-click="false"
              transition="scale-transition"
              offset-y
              min-width="auto"
              left
            >
              <template v-slot:activator="{ on, attrs }">
                <v-text-field
                  label="Expiration"
                  prepend-icon="mdi-calendar"
                  readonly
                  clearable
                  v-bind="attrs"
                  v-on="on"
                  v-model="date"
                  @click:clear="date = null"
                ></v-text-field>
              </template>
              <v-date-picker v-model="date" @input="menu = false"></v-date-picker>
            </v-menu>
            <small>*indicates required field</small>
            <v-card-actions class="px-0 pt-4">
              <v-spacer></v-spacer>
              <v-btn
                class="text-end"
                @click.prevent="
                  $emit('cancel');
                  reset();
                "
              >
                Cancel
              </v-btn>
              <v-btn
                class="text-end"
                color="primary"
                @click.prevent="createRole"
                :disabled="!valid"
              >
                Create
              </v-btn>
            </v-card-actions>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import { iamInterface as api } from '@/frontend/backend-api/index.js';

export default {
  props: {
    addRoleDialog: {
      type: Boolean,
      required: true,
    },
    roles: {
      type: Array,
      required: true,
    },
    resources: {
      type: Array,
      required: true,
    },
  },
  data: () => ({
    valid: false,
    roleName: '',
    description: '',
    date: null,
    menu: false,
    roleNameRules: [
      (v) => !!v || 'Name is required',
      (v) =>
        (v && v.length >= 5 && v.length <= 30) ||
        'Name must be more than 5 and less than 30 characters',
      (v) => /^[A-Za-z_-]+$/.test(v) || 'Allowed characters: A-Z & a-z & _ % -',
    ],
    descriptionRules: [
      (v) => !v || (v && v.length <= 255) || 'Description can only have 255 characters.',
    ],
  }),
  computed: {
    sameNameRule() {
      return () =>
        !this.roles.some((role) => role.name === this.roleName) || 'Role name already exists.';
    },
  },
  methods: {
    // resets the add role form
    reset() {
      this.roleName = '';
      this.description = '';
      this.date = null;
      this.$refs.form.reset();
      this.$refs.form.resetValidation();
    },
    // creates a completely new user
    async createRole() {
      if (this.valid) {
        const role = {
          name: this.roleName,
        };
        if (this.description) role.description = this.description;
        if (this.date) role.expiration = new Date(this.date).toISOString();
        try {
          const newRole = await api.addRole(role);
          if (newRole.hasOwnProperty('id')) {
            const initialValue = {};
            const nulledPermissions = this.resources.reduce((obj, item) => {
              return {
                ...obj,
                [item['type']]: 0,
              };
            }, initialValue);
            newRole.permissions = { ...nulledPermissions, ...role.permissions };
            this.roles.push(newRole);
            this.reset();
            this.$emit('roleAdded', newRole);
          } else {
            this.$emit('roleAdded', null);
          }
        } catch (error) {
          this.$emit('roleAdded', null);
        }
      }
    },
  },
};
</script>

<style scoped></style>

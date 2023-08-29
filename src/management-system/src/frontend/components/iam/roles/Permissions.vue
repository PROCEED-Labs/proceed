<template>
  <div
    class="d-flex flex-column mt-4"
    :class="scrollHeight ? 'pr-4' : ''"
    ref="container"
    style="overflow-y: auto; overflow-x: hidden; max-height: 500px"
  >
    <div
      v-for="(resource, resourceIndex) in resources"
      :key="resource.id"
      :resourceIndex="resourceIndex"
    >
      <p
        class="text-overline pa-0 ma-0 text-left font-weight-bold grey--text"
        :class="resourceIndex > 0 ? 'mt-6' : ''"
      >
        {{
          resource.type === 'User'
            ? resource.name
            : resource.type === 'Role'
            ? resource.name
            : resource.title
        }}
      </p>
      <div
        v-for="(action, actionIndex) in resource.actions"
        :key="actionIndex"
        :actionIndex="actionIndex"
      >
        <div
          class="d-flex justify-space-between align-center ma-0 pb-0"
          :class="actionIndex > 0 ? 'mt-2' : ''"
        >
          <p class="text-subtitle-2 font-weight-medium d-flex align-center">
            <v-tooltip
              top
              v-if="
                (action.name === 'admin' && !$can('admin', resource.type)) ||
                !$can('manage', 'Role')
              "
              color="error"
            >
              <template v-slot:activator="{ on, attrs }">
                <v-icon
                  v-if="
                    (action.name === 'admin' && !$can('admin', resource.type)) ||
                    !$can('manage', 'Role')
                  "
                  v-bind="attrs"
                  v-on="on"
                  >mdi-cancel</v-icon
                >
              </template>
              <span>{{
                action.name === 'admin'
                  ? 'Missing admin permissions for ' + resource.title
                  : 'Missing role permissions'
              }}</span>
            </v-tooltip>
            <span
              :class="
                (action.name === 'admin' && !$can('admin', resource.type)) ||
                !$can('manage', 'Role')
                  ? 'ml-1'
                  : ''
              "
              >{{ action.title }}</span
            >
          </p>
          <v-switch
            v-if="permissions[resource.type]"
            inset
            dense
            class="ma-0 mr-n3"
            :input-value="permissions[resource.type].includes(action.name)"
            :disabled="
              (action.name === 'admin' && !$can('admin', resource.type)) ||
              !$can('manage', 'Role') ||
              (permissions[resource.type].includes('admin') && action.name !== 'admin')
            "
            @change="setPermission(resource.type, action.name, $event)"
          ></v-switch>
        </div>
        <div class="mt-n3 mb-4">
          <v-subheader
            class="text-body-2 text-left ma-0 pa-0"
            style="height: auto"
            :disabled="true"
          >
            {{ action.description }}
          </v-subheader>
        </div>
        <v-divider v-if="actionIndex < resource.actions.length - 1"></v-divider>
      </div>
    </div>
  </div>
</template>

<script>
import { translateListToPermission } from '@/frontend/helpers/iam/permissions/permissions-handler.js';
import { PERMISSION_MAPPING, PERMISSION_ADMIN } from '@/shared-frontend-backend/constants/index.js';

export default {
  props: {
    resources: {
      type: Array,
      required: true,
    },
    changes: {
      type: Array,
      required: true,
    },
    selectedRole: {
      type: Object,
      required: true,
    },
    copyOfSelectedRole: {
      type: Object,
      required: true,
    },
    permissions: {
      type: Object,
      required: true,
    },
    unmodifiedRoleState: {
      type: Array,
      required: true,
    },
  },
  data() {
    return {
      scrollHeight: false,
      PERMISSION_MAPPING,
      PERMISSION_ADMIN,
    };
  },
  mounted() {
    if (this.$refs.container.scrollHeight > 500) this.scrollHeight = true;
  },
  methods: {
    async setPermission(resource, action, bool) {
      if (bool) {
        this.permissions[resource].push(action);
        if ((await translateListToPermission(this.permissions[resource])) > PERMISSION_ADMIN) {
          const permission = Object.keys(PERMISSION_MAPPING).find(
            (key) => PERMISSION_MAPPING[key] === PERMISSION_ADMIN,
          );
          this.$set(this.permissions, resource, [permission]);
        }
      }
      if (!bool) {
        const index = this.permissions[resource].findIndex((verb) => verb === action);
        if (index > -1) this.permissions[resource].splice(index, 1);
      }
      this.$set(
        this.selectedRole.permissions,
        resource,
        await translateListToPermission(this.permissions[resource]),
      );
    },
  },
};
</script>

<style></style>

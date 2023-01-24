<template>
  <v-list dense nav class="pt-2">
    <v-list-item-group color="primary">
      <v-list-item router to="/machines" class="px-2" v-if="$can('view', 'Machine')">
        <v-list-item-icon>
          <v-icon>mdi-cellphone-link</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-title>Machines</v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      <v-list-item v-if="$can('view', 'Process')" router to="/process" class="px-2">
        <v-list-item-icon>
          <v-icon>$vuetify.icons.product</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-title>Processes</v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      <v-list-item v-if="$can('view', 'Project')" router to="/projects" class="px-2">
        <v-list-item-icon>
          <v-icon>mdi-ballot</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-title>Projects</v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      <v-list-item v-if="$can('view', 'Template')" router to="/templates" class="px-2">
        <v-list-item-icon>
          <v-icon>mdi-file-compare</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-title>Templates</v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      <v-list-item v-if="$can('view', 'Task')" router to="/tasklist" class="px-2">
        <v-list-item-icon>
          <v-icon>mdi-format-list-bulleted</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-title>Tasklist</v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      <v-list-item router to="/executions" class="px-2" v-if="$can('view', 'Execution')">
        <v-list-item-icon>
          <v-icon>mdi-checkbox-outline</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-title>Executions</v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      <v-list-item v-if="$can('view', 'EnvConfig')" router to="/environment-config" class="px-2">
        <v-list-item-icon>
          <v-icon>mdi-domain</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-title>Environment</v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      <v-list-item
        router
        to="/iam"
        class="px-2"
        v-if="
          $useAuthorization &&
          ($can('manage', 'Role') || $can('manage', 'User') || $can('manage-roles', 'User'))
        "
      >
        <v-list-item-icon>
          <v-icon>mdi-account-group</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-title>IAM</v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      <v-list-item v-if="$can('manage', 'Setting')" router to="/settings" class="px-2">
        <v-list-item-icon>
          <v-icon>mdi-wrench</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-title>Settings</v-list-item-title>
        </v-list-item-content>
      </v-list-item>
    </v-list-item-group>
  </v-list>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  computed: {
    ...mapGetters({
      isAuthenticated: 'authStore/isAuthenticated',
    }),
  },
};
</script>

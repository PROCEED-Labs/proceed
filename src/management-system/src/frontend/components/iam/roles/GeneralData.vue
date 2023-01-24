<template>
  <div
    class="d-flex flex-column mt-4"
    :class="scrollHeight ? 'pr-4' : ''"
    ref="container"
    style="overflow-y: auto; overflow-x: hidden; max-height: 500px"
  >
    <v-row class="ma-0 pa-0">
      <v-col cols="6" class="mx-0 pa-0">
        <v-subheader class="mx-0 pa-0">Name</v-subheader>
      </v-col>
      <v-col cols="6" class="py-0">
        <v-tooltip
          :disabled="!selectedRole.default && $can('manage', 'Role')"
          left
          color="error"
          nudge-top="6"
        >
          <template v-slot:activator="{ on, attrs }">
            <div v-bind="attrs" v-on="on">
              <v-text-field
                label="Name"
                :value="selectedRole.name"
                v-model="selectedRole.name"
                :disabled="selectedRole.default || !$can('manage', 'Role')"
              ></v-text-field>
            </div>
          </template>
          <span>{{ getDenyMessage }}</span>
        </v-tooltip>
      </v-col>
    </v-row>

    <v-row class="ma-0 pa-0">
      <v-col cols="6" class="mx-0 pa-0">
        <v-subheader class="mx-0 pa-0">Description</v-subheader>
      </v-col>
      <v-col cols="6" class="py-0">
        <v-tooltip left color="error" :disabled="$can('manage', 'Role')">
          <template v-slot:activator="{ on, attrs }">
            <div v-bind="attrs" v-on="on">
              <v-textarea
                filled
                counter="255"
                label="Description"
                :value="selectedRole.description"
                v-model="selectedRole.description"
                :disabled="!$can('manage', 'Role')"
              ></v-textarea>
            </div>
          </template>
          <span>Missing role permissions</span>
        </v-tooltip>
      </v-col>
    </v-row>

    <v-row class="ma-0 pa-0">
      <v-col cols="6" class="mx-0 pa-0">
        <v-subheader class="mx-0 pa-0">Expiration</v-subheader>
      </v-col>
      <v-col cols="6" class="py-0">
        <v-tooltip
          left
          color="error"
          nudge-top="5"
          :disabled="
            !selectedRole.default && $can('manage', 'Role') && missingAdminPermissions.length === 0
          "
        >
          <template v-slot:activator="{ on, attrs }">
            <div v-bind="attrs" v-on="on">
              <v-menu
                v-model="menu"
                :value="new Date(selectedRole.expiration).toISOString().slice(0, 10)"
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
                    :value="
                      selectedRole.expiration !== null ? selectedRole.expiration.substr(0, 10) : ''
                    "
                    @click:clear="setExpirationDate(null)"
                    :disabled="
                      selectedRole.default ||
                      !$can('manage', 'Role') ||
                      missingAdminPermissions.length > 0
                    "
                  ></v-text-field>
                </template>
                <v-date-picker @change="setExpirationDate" @input="menu = false"></v-date-picker>
              </v-menu>
            </div>
          </template>
          <span>{{ getDenyMessage }}</span>
        </v-tooltip>
      </v-col>
    </v-row>
  </div>
</template>

<script>
export default {
  props: {
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
    unmodifiedRoleState: {
      type: Array,
      required: true,
    },
    missingAdminPermissions: {
      type: Array,
      required: true,
    },
    getDenyMessage: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      menu: false,
      scrollHeight: false,
    };
  },
  methods: {
    setExpirationDate(date) {
      date
        ? (this.selectedRole.expiration = new Date(date).toISOString())
        : (this.selectedRole.expiration = null);
    },
  },
  mounted() {
    if (this.$refs.container.scrollHeight > 500) this.scrollHeight = true;
  },
};
</script>

<style></style>

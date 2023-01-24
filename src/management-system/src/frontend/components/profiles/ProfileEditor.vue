<template>
  <v-dialog :value="show" max-width="600px" @input="$emit('cancel')" scrollable>
    <v-card>
      <v-card-title>
        <span class="headline">{{ title }}</span>
      </v-card-title>
      <v-card-text>
        <v-form @submit.prevent>
          <v-divider />
          <v-expansion-panels v-if="!!profile" v-model="panel" flat multiple>
            <v-expansion-panel>
              <v-expansion-panel-header>General</v-expansion-panel-header>
              <v-expansion-panel-content>
                <v-select
                  v-model="type"
                  :items="profileTypes"
                  label="Profile type (required)"
                  :readonly="isEditing"
                />
                <v-combobox
                  v-if="level == 'environment' && type == 'Class'"
                  v-model="extendsProfile"
                  :items="profilesToExtend"
                  label="Extends Profile (required)"
                  :readonly="isEditing"
                />
                <v-combobox
                  v-if="level == 'environment' && type == 'Class'"
                  v-model="classes"
                  label="Classes"
                  multiple
                  chips
                />
                <v-text-field v-model="name" label="Name (required)" />
                <v-text-field
                  v-if="level == 'environment'"
                  v-model="environmentId"
                  label="ID of the Environment (required)"
                  :background-color="checkCondition('environmentId') ? greenColor : ''"
                />
                <v-text-field
                  v-if="level == 'environment'"
                  v-model="environmentName"
                  label="Name of the Envrionment (required)"
                  :background-color="checkCondition('environmentName') ? greenColor : ''"
                />
                <v-text-field
                  v-if="level == 'environment'"
                  v-model="priority"
                  type="number"
                  label="Priority"
                  :background-color="checkCondition('priority') ? greenColor : ''"
                />
                <v-combobox
                  v-if="level == 'environment'"
                  v-model="matcherIP"
                  label="IP-Matcher Objects"
                  chips
                  multiple
                  :background-color="checkCondition('matcherIP') ? greenColor : ''"
                />
                <v-combobox
                  v-if="level == 'environment'"
                  v-model="matcherWifiSSID"
                  label="Wifi SSIDs"
                  chips
                  multiple
                  :background-color="checkCondition('matcherWifiSSID') ? greenColor : ''"
                />
              </v-expansion-panel-content>
            </v-expansion-panel>
            <v-expansion-panel v-for="(keySection, name) in keys" :key="name">
              <v-expansion-panel-header>{{ sections[name] }}</v-expansion-panel-header>
              <v-expansion-panel-content>
                <div v-for="key in keySection" :key="key.name">
                  <v-select
                    v-if="key.valueType == 'Boolean'"
                    @change="handleChange(key.name, $event)"
                    :items="[true, false]"
                    :label="key.name"
                    :value="isEditing || type == 'Class' ? findValue(key.name) : key.default"
                    :background-color="hasProperty(key.name) ? greenColor : ''"
                  />
                  <v-combobox
                    v-else-if="key.valueType == 'Array'"
                    :label="key.name"
                    :value="isEditing || type == 'Class' ? findValue(key.name) : key.default || []"
                    :placeholder="'none'"
                    :background-color="hasProperty(key.name) ? greenColor : ''"
                    multiple
                    chips
                    @change="handleChange(key.name, $event)"
                  />
                  <v-text-field
                    v-else-if="key.valueType == 'Number'"
                    :label="key.name"
                    :value="isEditing || type == 'Class' ? findValue(key.name) : key.default"
                    :background-color="hasProperty(key.name) ? greenColor : ''"
                    type="number"
                    @change="handleChange(key.name, $event)"
                  />
                  <v-text-field
                    v-else
                    :label="key.name"
                    :value="isEditing || type == 'Class' ? findValue(key.name) : key.default"
                    :background-color="hasProperty(key.name) ? greenColor : ''"
                    @change="handleChange(key.name, $event)"
                  />
                </div>
              </v-expansion-panel-content>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn small @click="closeEditor()">Cancel</v-btn>
        <v-btn
          v-if="!isEditing"
          :disabled="
            !type ||
            !name ||
            !environmentName ||
            !environmentId ||
            (Object.entries(extendsProfile).length == 0 && type == 'Class')
          "
          color="primary"
          small
          @click="add"
        >
          Add
        </v-btn>
        <v-btn
          v-if="isEditing"
          :disabled="!name || !environmentName || !environmentId"
          color="primary"
          small
          @click="update"
        >
          Update
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
/* eslint-disable no-prototype-builtins */
import uuid from 'uuid';
import { mapState } from 'vuex';
import {
  jsKeys,
  routerKeys,
  processKeys,
  machineKeys,
} from '@/frontend/assets/profile-config-keys.js';
import defaultProfile from '@/frontend/assets/default-profile.json';

export default {
  name: 'profile-form',
  props: {
    show: { type: Boolean, default: false, required: true },
    title: { type: String, default: 'Profile' },
    level: { type: String, required: true },
    envProfile: {
      type: Object,
      default() {
        return {};
      },
    },
    isEditing: { type: Boolean, default: false },
    profileType: { type: String },
  },
  data() {
    return {
      profile: defaultProfile,
      classProfile: {},
      parentProfile: {},
      panel: [],
      name: '',
      type: '',
      profileTypes: ['Home', 'External', 'Class'],
      environmentName: '',
      environmentId: '',
      extendsProfile: {},
      priority: 1,
      classes: [],
      matcherIP: [],
      matcherWifiSSID: [],
      sections: {
        jsKeys: 'Javascript',
        routerKeys: 'Router',
        processKeys: 'Process',
        machineKeys: 'Machine',
      },
      keys: {
        jsKeys,
        routerKeys,
        processKeys,
        machineKeys,
      },
      greenColor: 'rgba(157,193,131, 0.5)',
    };
  },
  computed: mapState({
    jsKeys() {
      return jsKeys;
    },
    routerKeys() {
      return routerKeys;
    },
    processKeys() {
      return processKeys;
    },
    machineKeys() {
      return machineKeys;
    },
    profilesToExtend() {
      const array = [];
      this.$store.getters['environmentStore/environmentProfiles']
        .filter((profile) => profile.type !== 'Class')
        .forEach((p) => {
          const el = {
            text: p.name,
            value: p.id,
          };
          array.push(el);
        });
      return array;
    },
    basicProfileKeys() {
      return {
        name: this.name,
        environmentName: this.environmentName,
        environmentId: this.environmentId,
        matcherIP: this.matcherIP,
        matcherWifiSSID: this.matcherWifiSSID,
        priority: this.priority,
        classes: [],
        extends: null,
      };
    },
  }),
  watch: {
    async show() {
      if (this.envProfile && this.isEditing) {
        this.name = this.envProfile.name;
        this.type = this.profileType;
        if (this.profileType !== 'Class') {
          this.profile = this.envProfile;
          Object.keys(this.basicProfileKeys).forEach((key) => {
            if (key === 'extends') {
              this.extendsProfile = {};
            } else {
              this[key] = this.envProfile[key];
            }
          });
        }
        if (this.profileType === 'Class') {
          const parentProfile = await this.$store.getters['environmentStore/profileJSONById'](
            this.envProfile.extends
          );
          this.parentProfile = parentProfile;
          this.extendsProfile = {
            value: this.parentProfile.id,
            text: this.parentProfile.name,
          };
        }
      }
    },
    async extendsProfile() {
      if (this.type === 'Class' && this.show) {
        this.classProfile = {
          js: this.envProfile.js,
          machine: this.envProfile.machine,
          router: this.envProfile.router,
          process: this.envProfile.process,
        };
        const extendsValue = this.extendsProfile ? this.extendsProfile.value : null;
        const parentProfile = await this.$store.getters['environmentStore/profileJSONById'](
          extendsValue || this.envProfile.extends
        );
        this.parentProfile = parentProfile;
        Object.keys(this.basicProfileKeys).forEach((key) => {
          if (key === 'name') {
            this[key] = this.envProfile[key];
          } else if (key !== 'extends') {
            this[key] = this.envProfile[key] || this.parentProfile[key];
          }
        });
        const env = this.envProfile.machine ? this.envProfile.machine.env : {};
        this.profile = {
          js: { ...this.parentProfile.js, ...this.envProfile.js },
          machine: {
            ...this.parentProfile.machine,
            ...this.envProfile.machine,
            env: { ...this.parentProfile.machine.env, ...env },
          },
          router: { ...this.parentProfile.router, ...this.envProfile.router },
          process: { ...this.parentProfile.process, ...this.envProfile.process },
        };
      }
    },
  },
  methods: {
    add() {
      const id = uuid.v4();
      if (this.type !== 'Class') {
        this.$store.dispatch('environmentStore/add', {
          environmentProfile: {
            ...this.profile,
            ...this.basicProfileKeys,
            id,
          },
          type: this.type,
        });
      } else {
        const changedValues = this.getChangedValues();
        this.$store.dispatch('environmentStore/add', {
          environmentProfile: {
            ...this.classProfile,
            ...changedValues,
            id,
            name: this.name,
            extends: this.extendsProfile.value,
            classes: this.classes,
          },
          type: this.type,
        });
      }
      this.closeEditor();
    },
    getChangedValues() {
      const obj = {};
      const propertyArray = [
        'environmentName',
        'environmentId',
        'priority',
        'matcherIP',
        'matcherWifiSSID',
      ];
      propertyArray.forEach((property) => {
        if (this[property] !== this.parentProfile[property]) {
          obj[property] = this[property];
        }
      });
      return obj;
    },
    checkCondition(key) {
      return (
        this[key] !== this.parentProfile[key] && Object.entries(this.extendsProfile).length !== 0
      );
    },
    update() {
      if (this.type !== 'Class') {
        this.$store.dispatch('environmentStore/update', {
          profile: {
            ...this.profile,
            id: this.envProfile.id,
            ...this.basicProfileKeys,
          },
          type: this.type,
        });
      } else {
        const changedValues = this.getChangedValues();
        this.$store.dispatch('environmentStore/update', {
          profile: {
            ...this.classProfile,
            ...changedValues,
            id: this.envProfile.id,
            name: this.name,
            extends: this.extendsProfile.value,
            classes: this.classes,
          },
          type: this.type,
        });
      }
      this.closeEditor();
    },
    closeEditor() {
      this.panel = [];
      this.restoreDefaults();
      this.$emit('cancel');
    },
    handleChange(name, event) {
      const split = name.split('.');
      if (split.length === 2) {
        this.profile[split[0]][split[1]] = event;
      }
      if (split.length === 3) {
        this.profile[split[0]][split[1]][split[2]] = event;
      }
      if (this.type === 'Class') {
        if (split.length === 2) {
          if (!this.classProfile[split[0]]) this.classProfile[split[0]] = {};
          this.classProfile[split[0]][split[1]] = event;
        }
        if (split.length === 3) {
          if (!this.classProfile[split[0]]) this.classProfile[split[0]] = {};
          if (!this.classProfile[split[0]][split[1]]) this.classProfile[split[0]][split[1]] = {};
          this.classProfile[split[0]][split[1]][split[2]] = event;
        }
      }
    },
    hasProperty(name) {
      let result = false;
      const split = name.split('.');
      if (this.classProfile[split[0]]) {
        if (this.classProfile[split[0]].hasOwnProperty(split[1])) {
          if (split.length === 2) {
            result = true;
          } else if (this.classProfile[split[0]][split[1]].hasOwnProperty(split[2])) {
            result = true;
          }
        }
      }
      return result;
    },
    findValue(keyName) {
      if (this.profile && this.show) {
        const split = keyName.split('.');
        if (split.length === 2) {
          return this.profile[split[0]][split[1]];
        }
        if (split.length === 3) {
          return this.profile[split[0]][split[1]][split[2]];
        }
      }
      return '';
    },
    restoreDefaults() {
      this.type = '';
      this.name = '';
      this.environmentName = '';
      this.environmentId = '';
      this.extendsProfile = {};
      this.priority = 1;
      this.classes = [];
      this.matcherIP = [];
      this.matcherWifiSSID = [];
      this.profile = defaultProfile;
      this.classProfile = {};
    },
  },
};
</script>

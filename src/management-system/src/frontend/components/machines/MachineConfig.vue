<template>
  <v-dialog :value="show" max-width="650px" @input="$emit('close')" scrollable>
    <v-card style="overflow-x: hidden">
      <v-card-title>
        <v-icon class="mr-3">mdi-cellphone-link</v-icon>
        Machine Configuration Info
        <v-spacer />
        <v-icon @click="$emit('close')">mdi-close</v-icon>
      </v-card-title>
      <v-card-text class="ml-3" v-if="!!machineConfig">
        <settings-list
          :settings="machineConfig"
          @valueChanged="commitChange($event)"
          :save="saveConfig"
          :isTopLevel="true"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="$emit('close')">Cancel</v-btn>
        <v-btn
          :disabled="!$can('manage', 'Machine')"
          style="position: sticky; z-index: 999"
          color="primary"
          @click="saveConfig = true"
          >Save</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
<script>
import { engineNetworkInterface } from '@/frontend/backend-api/index.js';
import SettingsList from '@/frontend/components/settings/SettingsList.vue';

export default {
  name: 'MachineConfig',
  props: {
    machine: {
      type: Object,
    },
    show: {
      type: Boolean,
      required: true,
    },
  },
  data() {
    return {
      machineConfig: null,
      saveConfig: false,
    };
  },
  components: { SettingsList },
  methods: {
    async commitChange(event) {
      if (this.machine) {
        const keys = Object.keys(event);
        keys.forEach(async (key) => {
          this.machineConfig[key] = event[key];
        });
        await engineNetworkInterface.sendConfiguration(this.machine.id, this.machineConfig);
      }
      this.saveConfig = false;
      this.$emit('close');
    },
  },
  async mounted() {
    if (this.machine) {
      const config = await engineNetworkInterface.getConfiguration(this.machine.id);
      this.machineConfig = config;
      this.configDialog = true;
    }
  },
};
</script>

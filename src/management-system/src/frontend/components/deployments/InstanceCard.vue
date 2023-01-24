<template>
  <v-card v-if="selectedInstance || selectedVersion">
    <v-card-text v-if="selectedInstance">
      <v-alert :type="statusType" text>
        {{ statusText }}
      </v-alert>

      <div v-if="selectedInstance.globalStartTime">
        <v-icon left>mdi-calendar</v-icon>
        <strong>Start Date: </strong>
        <DateTooltip :dateTime="selectedInstance.globalStartTime" />
      </div>

      <SimpleMachineList :machines="selectedInstance.machines" />
    </v-card-text>
    <v-card-text v-else>
      <div>
        <strong>Deployment Method: </strong>
        {{ selectedVersion.deploymentMethod }}
      </div>

      <SimpleMachineList :machines="deployment.machines" />
    </v-card-text>
  </v-card>
</template>
<script>
import SimpleMachineList from '@/frontend/components/deployments/SimpleMachineList.vue';
import DateTooltip from '@/frontend/components/universal/DateTooltip.vue';
import { statusToType } from '@/frontend/helpers/instance-information';
export default {
  props: {
    selectableInstances: Array,
    selectedInstance: Object,
    deployment: Object,
    statusText: String,
    selectedVersion: Object,
  },
  components: {
    DateTooltip,
    SimpleMachineList,
  },
  computed: {
    statusType() {
      return statusToType(this.statusText.toUpperCase());
    },
    selectedI: {
      get: function () {
        return this.selectedInstance ? this.selectedInstance : null;
      },
      set: function (newValue) {
        this.$emit('selectInstance', newValue);
      },
    },
  },
};
</script>

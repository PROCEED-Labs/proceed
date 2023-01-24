<template>
  <v-card>
    <v-card-title>
      <slot></slot>
      <v-spacer></v-spacer>

      <v-text-field
        class="ma-0"
        v-model="searchDeployments"
        append-icon="mdi-magnify"
        label="Search"
        single-line
        hide-details
        :disabled="!deployments || deployments.length === 0"
        clearable
      ></v-text-field>
    </v-card-title>
    <v-divider />
    <v-data-table
      :headers="headers"
      :items="deployments"
      :search="searchDeployments"
      class="deployment-data-table"
    >
      <template v-slot:item.name="{ item }">
        {{ getLatestVersionName(item) }}
      </template>

      <template v-slot:item.type="{ item }">
        <v-chip v-if="item.type === 'project'" small color="primary"> Project </v-chip>
      </template>

      <template v-slot:item.machines="{ item }">
        <SimpleMachineList :machines="item.machines" chips />
      </template>
      <template v-slot:item.actions="{ item }">
        <v-btn color="primary" @click="$emit('openModal', item)">Show Instances</v-btn>
        <v-icon
          class="ml-2"
          v-if="isExternal"
          color="primary"
          @click.stop="$emit('click:import', item)"
          >mdi-download</v-icon
        >
        <v-icon
          color="error"
          class="mx-2"
          @click.stop="removeDeploymentItem = item"
          :loading="isCurrentlyDeleting == item.definitionId"
          >mdi-delete</v-icon
        >
      </template>
    </v-data-table>

    <confirmation
      title="delete the deployment?"
      continueButtonText="Delete Deployment"
      continueButtonColor="error"
      :show="!!removeDeploymentItem"
      maxWidth="500px"
      @cancel="removeDeploymentItem = null"
      @continue="removeDeployment"
    >
      <div>You are about to delete the deployment and stop all instances!</div>
    </confirmation>
  </v-card>
</template>
<script>
import { engineNetworkInterface } from '@/frontend/backend-api/index.js';
import Confirmation from '@/frontend/components/universal/Confirmation.vue';
import SimpleMachineList from '@/frontend/components/deployments/SimpleMachineList.vue';

export default {
  components: {
    Confirmation,
    SimpleMachineList,
  },
  props: {
    deployments: { type: Array, required: true },
    isExternal: { type: Boolean, required: false, default: false },
    noDataText: { type: String, required: false },
  },
  watch: {
    deployments() {
      this.isCurrentlyDeleting = null;
    },
  },
  data() {
    return {
      searchDeployments: '',
      internalDeployments: [],
      removeDeploymentItem: null,
      isCurrentlyDeleting: null,
      headers: [
        { text: 'Process Name', value: 'name', align: 'left' },
        { text: '', value: 'type', sortable: false, align: 'left' },
        { text: 'Versions', width: '10%', value: 'versions.length', align: 'left' },
        {
          text: 'Running Instances',
          width: '10%',
          value: 'runningInstances.length',
          align: 'left',
        },
        { text: 'Ended Instances', width: '10%', value: 'endedInstances.length', align: 'left' },
        { text: 'Machines', value: 'machines', sortable: false, align: 'left' },
        { text: '', value: 'actions', width: 275, sortable: false, align: 'left' },
      ],
    };
  },

  methods: {
    getLatestVersionName(deployment) {
      const versions = [...deployment.versions];

      const latestVersion = versions.sort((a, b) => b - a)[0];

      return latestVersion.name || latestVersion.deploymentName || latestVersion.definitionName;
    },
    async removeDeployment() {
      this.isCurrentlyDeleting = this.removeDeploymentItem;
      await engineNetworkInterface.removeDeployment(this.removeDeploymentItem.definitionId);

      this.removeDeploymentItem = null;
    },
  },
};
</script>

<style lang="scss">
.deployment-data-table.v-data-table tbody tr:not(.v-data-table__empty-wrapper) {
  cursor: pointer;

  &:not(.v-data-table__expanded__content):nth-of-type(odd) {
    background-color: #f5f5f5;
  }

  &:not(.v-data-table__expanded__content):hover,
  &.v-data-table__expanded.v-data-table__expanded__row {
    background-color: #1976d248;
  }

  &.v-data-table__expanded.v-data-table__expanded__content {
    cursor: default;
  }
}
</style>

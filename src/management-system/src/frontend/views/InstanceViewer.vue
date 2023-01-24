<template>
  <instance-viewer :deployment="deployment" :instance="instance" hideToolbar />
</template>
<script>
import InstanceViewer from '@/frontend/components/deployments/Instance.vue';

export default {
  props: ['processDefinitionsId', 'instanceId'],
  components: {
    InstanceViewer,
  },
  computed: {
    deployedProcesses() {
      return this.$store.getters['machineStore/deployments'];
    },
    deployment() {
      return this.deployedProcesses.find(
        (deployment) => deployment.definitionId === this.processDefinitionsId
      );
    },
    instances() {
      if (!this.deployment) {
        return [];
      }

      return this.deployment.instances;
    },
    instance() {
      return this.instances.find((i) => i.processInstanceId === this.instanceId);
    },
  },
};
</script>

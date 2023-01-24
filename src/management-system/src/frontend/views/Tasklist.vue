<template>
  <div class="wrapper">
    <v-toolbar class="flex-grow-0">
      <v-toolbar-title>Tasklist</v-toolbar-title>
    </v-toolbar>
    <v-container fluid class="flex-container">
      <v-row justify="center" class="flex-grow-1">
        <v-col cols="3">
          <p v-if="activeUserTasks.length === 0" class="text-center centered text-overline">
            There are currently no tasks in your queue.
          </p>
          <v-card
            v-else
            v-for="userTask in activeUserTasks"
            :key="`${userTask.id}-${userTask.instanceID}`"
            @click.stop="showUserTask(userTask)"
            class="my-2 px-2 rounded-lg"
            :color="isSelected(userTask) ? '#0094a0' : ''"
          >
            <v-card-title
              :class="isSelected(userTask) ? 'justify-center white--text' : 'justify-center'"
              >{{ userTask.name || userTask.id }}</v-card-title
            >
            <v-card-text
              :class="isSelected(userTask) ? 'pa-0 text-center white--text' : 'pa-0 text-center'"
            >
              {{ getDefinitionName(userTask) }}
            </v-card-text>
          </v-card>
        </v-col>
        <v-divider vertical></v-divider>
        <v-col cols="9">
          <div
            id="iframe-container"
            :style="{
              display: selectedUserTask ? 'block' : 'none',
            }"
          ></div>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>
<script>
import { engineNetworkInterface, processInterface } from '../backend-api/index.js';
export default {
  components: {},
  data() {
    return {
      selectedUserTask: null,
    };
  },
  computed: {
    availableMachines() {
      return this.$store.getters['machineStore/machines'].map((machine) => ({
        host: machine.ip,
        port: machine.port,
      }));
    },
    activeUserTasks() {
      return this.$store.getters['deploymentStore/activeUserTasks'];
    },
  },
  methods: {
    isSelected(userTask) {
      if (!this.selectedUserTask) {
        return false;
      }

      return (
        this.selectedUserTask.id === userTask.id &&
        this.selectedUserTask.instanceID === userTask.instanceID
      );
    },
    getStoredProcessOfUserTask(userTask) {
      if (userTask) {
        const processes = this.$store.getters['processStore/processes'];
        const storedProcess = processes.find((process) =>
          userTask.instanceID.startsWith(process.id)
        );
        return storedProcess;
      }
      return null;
    },
    getDefinitionName(userTask) {
      const process = this.getStoredProcessOfUserTask(userTask);

      if (process) {
        return process.name;
      }
      return 'Loading...';
    },

    async importProcess(userTask) {
      const deployments = this.$store.getters['deploymentStore/deployments'];
      const userTaskDeployment = Object.entries(deployments).find(([deploymentId]) => {
        if (userTask.instanceID.startsWith(deploymentId)) {
          return true;
        }
      })[1];

      // let the backend import the process from known engines
      await engineNetworkInterface.importProcess(userTaskDeployment.definitionId);

      // pull the information about the imported process from the backend
      const process = await processInterface.pullProcess(userTaskDeployment.definitionId);
      const bpmn = process.bpmn;
      delete process.bpmn;
      await this.$store.dispatch('processStore/add', { process, bpmn });
    },
    async showUserTask(userTask) {
      this.selectedUserTask = userTask;

      const container = document.querySelector('#iframe-container');
      container.innerHTML = '';
      const iframe = document.createElement('iframe');
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 0;
      container.appendChild(iframe);
      iframe.contentWindow.document.open();
      iframe.contentWindow.document.write(userTask.html);
      iframe.contentWindow.PROCEED_DATA = {
        post: async (path, body, query) => {
          if (path === '/tasklist/api/userTask') {
            //submit user task
            const { instanceID, userTaskID } = query;
            engineNetworkInterface.completeUserTask(instanceID, userTaskID);
            this.selectedUserTask = null;
          }
        },
        put: async (path, body, query) => {
          if (path === '/tasklist/api/milestone') {
            //change milestone value
            const { instanceID, userTaskID } = query;
            engineNetworkInterface.updateUserTaskMilestone(instanceID, userTaskID, body);
          }
          if (path === '/tasklist/api/variable') {
            //change variable value
            const { instanceID, userTaskID } = query;
            engineNetworkInterface.updateUserTaskIntermediateVariablesState(
              instanceID,
              userTaskID,
              body
            );
          }
        },
      };
      iframe.contentWindow.document.close();
    },
  },
  async mounted() {
    this.$store.dispatch('deploymentStore/subscribeForDeploymentUpdates');
    this.$store.dispatch('deploymentStore/subscribeForActiveUserTaskUpdates');
  },
  async beforeDestroy() {
    await this.$store.dispatch('deploymentStore/unsubscribeFromDeploymentUpdates');
    await this.$store.dispatch('deploymentStore/unsubscribeFromActiveUserTaskUpdates');
  },
  watch: {
    activeUserTasks(updatedActiveUserTasks) {
      updatedActiveUserTasks.forEach((userTask) => {
        if (!this.getStoredProcessOfUserTask(userTask)) {
          this.importProcess(userTask);
        }
      });

      if (this.selectedUserTask) {
        const selectedUserTaskRemoved = !updatedActiveUserTasks.find(
          (userTask) =>
            userTask.instanceID === this.selectedUserTask.instanceID &&
            userTask.id === this.selectedUserTask.id
        );

        if (selectedUserTaskRemoved) {
          this.selectedUserTask = null;
        }
      }
    },
  },
};
</script>
<style lang="scss" scoped>
.wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.flex-container {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  margin: 6px 0;
}

#iframe-container {
  width: 100%;
  height: 100%;
}
</style>

<template>
  <div class="wrapper">
    <v-toolbar class="flex-grow-0">
      <v-toolbar-title>Tasklist</v-toolbar-title>
      <v-spacer></v-spacer>
      <div class="d-flex align-end justify-end">
        <v-menu :close-on-content-click="false" bottom offset-y>
          <template v-slot:activator="{ on }">
            <v-btn v-on="on" class="mr-2">
              <v-icon v-on="on">mdi-filter</v-icon
              ><span v-if="$vuetify.breakpoint.width > 768">Filter Tasks</span>
            </v-btn>
          </template>
          <v-list>
            <v-list-item>
              <v-list-item-content>
                <v-list-item-title>Status:</v-list-item-title>
                <div class="d-flex flex-column">
                  <v-checkbox
                    v-for="filterItem in filterItems"
                    :key="filterItem"
                    v-model="selectedStatus"
                    :label="filterItem"
                    :value="filterItem"
                    hide-details
                  ></v-checkbox>
                </div>
              </v-list-item-content>
            </v-list-item>
            <v-divider></v-divider>
            <v-list-item>
              <v-list-item-content>
                <v-list-item-title>Priority:</v-list-item-title>
                <div class="d-flex align-center">
                  <v-range-slider
                    min="1"
                    max="10"
                    v-model="selectedPriority"
                    hide-details
                  ></v-range-slider>
                  <span class="ml-2">{{ selectedPriority[0] }} - {{ selectedPriority[1] }}</span>
                </div>
              </v-list-item-content>
            </v-list-item>
            <v-divider></v-divider>
            <v-list-item>
              <v-list-item-content>
                <v-list-item-title>Progress:</v-list-item-title>
                <div class="d-flex align-center">
                  <v-range-slider
                    min="0"
                    max="100"
                    v-model="selectedProgress"
                    hide-details
                  ></v-range-slider>
                  <span class="ml-2">{{ selectedProgress[0] }} - {{ selectedProgress[1] }}</span>
                </div>
              </v-list-item-content>
            </v-list-item>
            <v-divider></v-divider>
            <v-list-item>
              <v-list-item-content>
                <v-list-item-title>Users:</v-list-item-title>
                <div class="d-flex align-center">
                  <v-autocomplete
                    :items="userItems"
                    v-model="selectedUsers"
                    multiple
                    chips
                    small-chips
                  ></v-autocomplete>
                </div>
              </v-list-item-content>
            </v-list-item>
            <v-divider></v-divider>
            <v-list-item>
              <v-list-item-content>
                <v-list-item-title>Groups:</v-list-item-title>
                <div class="d-flex align-center">
                  <v-autocomplete
                    :items="groupItems"
                    v-model="selectedGroups"
                    multiple
                    chips
                    small-chips
                  ></v-autocomplete>
                </div>
              </v-list-item-content>
            </v-list-item>
          </v-list>
        </v-menu>
        <v-menu :close-on-content-click="false" bottom offset-y>
          <template v-slot:activator="{ on }">
            <v-btn v-on="on">
              <v-icon v-on="on">mdi-sort</v-icon
              ><span v-if="$vuetify.breakpoint.width > 768">Sort Tasks</span></v-btn
            >
          </template>
          <v-list>
            <v-list-item-group
              mandatory
              :value="selectedSorting.value"
              @change="updateSorting($event, true)"
              color="primary"
            >
              <v-list-item v-for="item in sortItems" :key="item.value" :value="item">
                <template v-slot:default="{ active, toggle }">
                  <v-list-item-content>
                    <v-list-item-title v-model="active">
                      <div
                        v-if="active"
                        @click="updateSorting(selectedSorting.value, !selectedSorting.ascending)"
                      >
                        <span class="mr-2">{{ item }}</span>
                        <v-icon dense v-if="selectedSorting.ascending">mdi-arrow-up-thin</v-icon>
                        <v-icon dense v-else>mdi-arrow-down-thin</v-icon>
                      </div>
                      <span v-else>{{ item }}</span>
                    </v-list-item-title>
                  </v-list-item-content>
                </template>
              </v-list-item>
            </v-list-item-group>
          </v-list>
        </v-menu>
      </div>
    </v-toolbar>
    <div class="tasklist-container">
      <div class="list">
        <div class="tasks-wrapper">
          <div class="tasks">
            <p v-if="showingUserTasks.length === 0" class="infoBox">
              There are currently no tasks in your queue.
            </p>
            <user-task-card
              v-else
              v-for="userTask in showingUserTasks"
              :key="`${userTask.id}-${userTask.instanceID}-${userTask.startTime}`"
              class="task"
              :userTask="userTask"
              :isSelected="isSelected(userTask)"
              @click="showUserTask(userTask)"
            ></user-task-card>
          </div>
          <div class="return">
            <v-icon
              v-if="$vuetify.breakpoint.width <= 768 && selectedUserTask"
              @click="showUserTask(null)"
              >mdi-arrow-left</v-icon
            >
          </div>
        </div>
      </div>
      <v-divider v-if="$vuetify.breakpoint.width <= 768 && selectedUserTask"></v-divider>
      <div
        class="formView"
        :style="{
          display: selectedUserTask ? 'flex' : 'none',
        }"
      >
        <div
          :style="{
            display: selectedUserTask && !isUserTaskActive(selectedUserTask) ? 'block' : 'none',
          }"
          class="overlay"
        ></div>
      </div>
    </div>
  </div>
</template>
<script>
import UserTaskCard from '@/frontend/components/userTasks/userTaskCard.vue';
import { engineNetworkInterface, processInterface } from '../backend-api/index.js';

export default {
  components: { UserTaskCard },
  data() {
    return {
      selectedUserTask: null,
      sortItems: ['Start Time', 'Deadline', 'Progress', 'Priority', 'State'],
      filterItems: ['READY', 'ACTIVE', 'COMPLETED', 'PAUSED'],
      userItems: [],
      groupItems: [],
      items: [
        {
          name: 'Status:',
          children: [
            { name: 'READY' },
            { name: 'ACTIVE' },
            { name: 'COMPLETED' },
            { name: 'PAUSED' },
          ],
        },
      ],
      selectedStatus: ['READY', 'ACTIVE'],
      selectedPriority: [1, 10],
      selectedProgress: [0, 100],
      selectedSorting: { value: 'Start Time', ascending: true },
      selectedUsers: [],
      selectedGroups: [],
    };
  },
  computed: {
    availableMachines() {
      return this.$store.getters['machineStore/machines'].map((machine) => ({
        host: machine.ip,
        port: machine.port,
      }));
    },
    userTasks() {
      return this.$store.getters['deploymentStore/activeUserTasks'];
    },
    showingUserTasks() {
      const userTasks = this.updateUserTaskPlacement();
      if (this.$vuetify.breakpoint.width <= 768 && this.selectedUserTask) {
        return userTasks.length > 0 ? [this.selectedUserTask] : [];
      }
      return userTasks;
    },
  },
  methods: {
    isSelected(userTask) {
      if (!this.selectedUserTask) {
        return false;
      }

      return (
        this.selectedUserTask.id === userTask.id &&
        this.selectedUserTask.instanceID === userTask.instanceID &&
        this.selectedUserTask.startTime === userTask.startTime
      );
    },
    isUserTaskActive(userTask) {
      return userTask.state === 'READY' || userTask.state === 'ACTIVE';
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
    calculateRunningTime(startTime) {
      const runningTimeInMs = +new Date() - startTime;
      const days = runningTimeInMs / (1000 * 60 * 60 * 24);
      const hours = (days - Math.floor(days)) * 24;
      const minutes = (hours - Math.floor(hours)) * 60;

      const daysString = days >= 1 ? `${Math.floor(days)}d` : '';
      const hoursString = hours >= 1 ? `${Math.floor(hours)}h` : '';
      return `${daysString} ${hoursString} ${Math.floor(minutes)}min`;
    },
    updateSorting(sortingValue, isAscending) {
      this.selectedSorting = { value: sortingValue, ascending: isAscending };
    },
    updateUserTaskPlacement() {
      const showingUserTasks = this.userTasks.filter((uT) => {
        const userTaskUsers = uT.performers.filter((u) => !!u.meta.name).map((u) => u.meta.name);
        const userTaskGroups = uT.performers
          .filter((u) => !!u.meta.groupname)
          .map((u) => u.meta.groupname);

        return (
          this.selectedStatus.includes(uT.state) &&
          uT.priority >= this.selectedPriority[0] &&
          uT.priority <= this.selectedPriority[1] &&
          uT.progress >= this.selectedProgress[0] &&
          uT.progress <= this.selectedProgress[1] &&
          (this.selectedUsers.length === 0 ||
            this.selectedUsers.find((user) => !!userTaskUsers.find((p) => p === user))) &&
          (this.selectedGroups.length === 0 ||
            this.selectedGroups.find((user) => !!userTaskGroups.find((p) => p === user)))
        );
      });

      switch (this.selectedSorting.value) {
        case 'Start Time':
          showingUserTasks.sort((a, b) =>
            this.selectedSorting.ascending ? a.startTime - b.startTime : b.startTime - a.startTime
          );
          break;
        case 'Deadline':
          showingUserTasks.sort((a, b) => {
            if (a.endTime === b.endTime) {
              this.selectedSorting.ascending
                ? a.startTime - b.startTime
                : b.startTime - a.startTime;
            }
            return this.selectedSorting.ascending ? a.endTime - b.endTime : b.endTime - a.endTime;
          });
          break;
        case 'Progress':
          showingUserTasks.sort((a, b) => {
            if (a.progress === b.progress) {
              this.selectedSorting.ascending
                ? a.startTime - b.startTime
                : b.startTime - a.startTime;
            }
            return this.selectedSorting.ascending
              ? a.progress - b.progress
              : b.progress - a.progress;
          });
          break;
        case 'Priority':
          showingUserTasks.sort((a, b) => {
            if (a.priority === b.priority) {
              this.selectedSorting.ascending
                ? a.startTime - b.startTime
                : b.startTime - a.startTime;
            }
            return this.selectedSorting.ascending
              ? a.priority - b.priority
              : b.priority - a.priority;
          });
          break;
        case 'State':
          showingUserTasks.sort((a, b) => {
            const stateOrder = ['READY', 'ACTIVE', 'COMPLETED', 'PAUSED'];
            if (a.state === b.state) {
              this.selectedSorting.ascending
                ? a.startTime - b.startTime
                : b.startTime - a.startTime;
            }
            const indexA = stateOrder.findIndex((state) => a.state === state);
            const indexB = stateOrder.findIndex((state) => b.state === state);
            return this.selectedSorting.ascending ? indexA - indexB : indexB - indexA;
          });
          break;
      }

      return showingUserTasks;
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

      const container = document.querySelector('.formView');
      const iframes = container.querySelectorAll('iframe');
      Array.from(iframes).forEach((iFr) => {
        container.removeChild(iFr);
      });
      const overlay = document.querySelector('.overlay');
      overlay.innerHTML = '';

      if (!userTask) {
        return;
      }

      const iframe = document.createElement('iframe');
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 0;

      if (userTask.state === 'PAUSED') {
        iframe.style.pointerEvents = 'none';
        const h3 = document.createElement('h3');
        h3.innerText = 'This task is paused!';
        const p = document.createElement('p');
        p.innerText = 'This task was paused by your supervisor.';

        overlay.append(h3, p);
        iframe.style.opacity = '0.2';
      } else if (userTask.state === 'COMPLETED') {
        iframe.style.pointerEvents = 'none';
        const h3 = document.createElement('h3');
        h3.innerText = 'This task is completed!';

        overlay.append(h3);
        iframe.style.opacity = '0.2';
      }

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
    userTasks: {
      handler(updatedUserTasks) {
        updatedUserTasks.forEach((userTask) => {
          if (!this.getStoredProcessOfUserTask(userTask)) {
            this.importProcess(userTask);
          }
        });

        const performers = updatedUserTasks.map((uT) => uT.performers).flat();
        const users = performers
          .filter((performer) => !!performer.meta.name)
          .map((user) => user.meta.name);
        const groups = performers
          .filter((performer) => !!performer.meta.groupname)
          .map((group) => group.meta.groupname);

        this.userItems = [...new Set(users)];
        this.groupItems = [...new Set(groups)];
      },
      immediate: true,
    },
    showingUserTasks(newShowingUserTasks) {
      if (this.selectedUserTask) {
        const selectedUserTaskRemoved = !newShowingUserTasks.find(
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

.infoBox {
  text-align: center;
  margin: 40px 10px 10px;
  font-size: 1.1em;
  color: #a5a5a5;
  letter-spacing: 0.03em;
}

.tasklist-container {
  display: flex;
  flex-direction: row;
  flex-grow: 1;

  .list {
    display: flex;
    flex-direction: column;
    box-shadow: 0px 0px 6px -3px #9a9a9a;
    background: #fafafa;

    .tasks-wrapper {
      display: flex;
      flex-direction: row;
      justify-content: center;
      padding: 12px;
    }

    .tasks {
      display: flex;
      flex-direction: column;
    }
    .task {
      margin-bottom: 10px;
    }
  }
}

@media (max-width: 768px) {
  .tasklist-container {
    display: flex;
    flex-direction: column;
    flex-grow: 1;

    .list {
      flex-grow: 1;

      .tasks-wrapper {
        display: flex;
        flex-direction: row;
        justify-content: flex-end;
        padding: 10px 10px 0px;

        .tasks {
          margin: auto;
        }
      }
    }
  }
}

@media (max-width: 425px) {
  .tasklist-container .list .tasks-wrapper {
    display: flex;
    flex-direction: column-reverse;
    padding: 8px 8px 0px;

    .return {
      display: flex;
      flex-direction: row;
      justify-content: flex-end;
    }
  }
}

.formView {
  height: 100%;
  display: flex;
  flex-grow: 1;
  justify-content: center;
  align-items: center;
  position: relative;
}

.overlay {
  position: absolute;
  font-size: x-large;
  text-align: center;
}

.v-progress-circular__underlay {
  stroke: rgb(182 182 182) !important;
}

.v-treeview-node__root {
  padding-left: 0 !important;
}
.v-treeview-node__toggle {
  display: none !important;
}
.v-treeview-node__checkbox {
  margin-left: 0 !important;
}
.v-treeview-node__level {
  width: 12px !important;
}
</style>

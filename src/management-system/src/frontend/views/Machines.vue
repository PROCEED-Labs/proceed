<template>
  <div>
    <v-toolbar>
      <v-toolbar-title>Machines</v-toolbar-title>
      <v-spacer />
      <v-btn
        v-if="$can('manage', 'Machine')"
        color="primary"
        @click="addMachineDialog = true"
        :loading="addIsWaitingForBackend"
        >Add</v-btn
      >
    </v-toolbar>

    <confirmation
      v-if="tobeDeletedMachine.all == true"
      :title="'delete all saved machines?'"
      :text="confirmationText"
      continueButtonText="Delete all"
      continueButtonColor="error"
      :show="removeMachineDialog"
      maxWidth="350px"
      @cancel="removeMachineDialog = false"
      @continue="deleteAllSaved()"
    />
    <confirmation
      v-else
      :title="'delete the selected machine?'"
      :text="confirmationText"
      continueButtonText="Delete"
      continueButtonColor="error"
      :show="removeMachineDialog"
      @cancel="removeMachineDialog = false"
      @continue="deleteMachine()"
    />

    <!-- create one container for discovered and one for saved machines -->
    <v-container
      fluid
      v-for="(array, index) in [
        $store.getters['machineStore/discoveredMachines'],
        $store.getters['machineStore/savedMachines'],
      ]"
      :key="index"
    >
      <v-row justify="center" id="wrapper">
        <v-col class="text-center centered">
          <v-card>
            <v-subheader>{{ !index ? 'Discovered' : 'Saved' }}</v-subheader>
            <div v-if="index === 0">
              <MachineForm
                :show="addMachineDialog"
                @cancel="addMachineDialog = false"
                @add="addMachine"
              />
              <MachineForm
                :machine="editingMachine"
                :show="!!editMachineId"
                @cancel="editMachineId = ''"
                @update="updateMachine"
              />
            </div>
            <v-card-text>
              <v-data-table
                :headers="fields"
                :items="index === 0 ? connectedMachines(array) : array"
                hide-default-footer
              >
                <template v-slot:item="{ item }">
                  <tr
                    @click="toggleDisplayDetailed(item)"
                    style="text-align: center"
                    v-if="item.saved || item.status === 'CONNECTED'"
                  >
                    <td>{{ item.name }}</td>
                    <td>{{ item.hostname }}</td>
                    <td>
                      {{ item.ip }}
                      <svg v-if="item.status === 'CONNECTED'" width="15px" height="15px">
                        <circle cx="7.5" cy="10" r="5" fill="#0c0" />
                      </svg>
                      <svg
                        v-if="item.status !== 'CONNECTED' && item.saved"
                        width="15px"
                        height="15px"
                      >
                        <circle cx="7.5" cy="10" r="5" fill="#a00" />
                      </svg>
                    </td>
                    <!--td>{{ item.port }}</td-->
                    <td>{{ item.optionalName }}</td>
                    <td>{{ item.id }}</td>
                    <td>{{ item.description }}</td>
                    <td v-if="item.saved && $can('manage', 'Machine')">
                      <v-icon @click.stop="editMachineId = item.id" class="mx-0" color="primary">
                        mdi-pencil
                      </v-icon>
                      <v-icon
                        class="mx-0"
                        color="error"
                        @click.stop="openRemoveMachineDialog(false, item.id)"
                      >
                        mdi-delete
                      </v-icon>
                    </td>
                    <td v-if="!item.saved && $can('manage', 'Machine')">
                      <v-icon class="mx-0" @click.stop="setMachineSaved(item)" color="primary">
                        mdi-content-save
                      </v-icon>
                    </td>
                  </tr>
                  <tr>
                    <td
                      :colspan="fields.length"
                      v-if="elementInDisplayDetailed(item)"
                      class="detailed detailedBottom"
                    >
                      <v-card class="text-left my-2">
                        <v-card-text>
                          <div>
                            <span class="font-weight-medium">Machine: </span>
                            <a>{{ item.hostname }}</a>
                          </div>
                          <v-divider class="my-2" />
                          <v-card flat class="mb-2 ml-3">
                            <MachineInfo
                              :displayDetailed="displayDetailed"
                              @showConfig="configDialog = true"
                            />
                            <MachineConfig
                              :machine="detailedMachine"
                              :show="configDialog"
                              @close="configDialog = false"
                            />
                          </v-card>
                        </v-card-text>
                      </v-card>
                    </td>
                  </tr>
                </template>
              </v-data-table>
              <div v-if="!!index">
                <svg width="15px" height="15px">
                  <circle cx="7.5" cy="10" r="5" fill="#0c0" />
                </svg>
                <label>= connection established</label>
              </div>
            </v-card-text>
            <v-btn
              class="mb-3"
              color="error"
              small
              @click="openRemoveMachineDialog(true, 0)"
              v-if="!!index && $can('manage', 'Machine')"
            >
              Delete All
            </v-btn>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script>
import { v4 } from 'uuid';
import MachineForm from '@/frontend/components/machines/MachineForm.vue';
import MachineConfig from '@/frontend/components/machines/MachineConfig.vue';
import MachineInfo from '@/frontend/components/machines/MachineInfo.vue';
import { fields } from '@/frontend/helpers/machine-fields.ts';
import confirmation from '@/frontend/components/universal/Confirmation.vue';
import { engineNetworkInterface } from '@/frontend/backend-api/index.js';

/**
 * @module views
 */
/**
 * @memberof module:views
 * @module Vue:Machines
 *
 * @vue-computed {Array} machines - list of machines
 * @vue-computed editingMachine
 * @vue-computed detailedMachine
 * @vue-computed fields
 */
export default {
  name: 'Machines',
  components: {
    MachineForm,
    MachineConfig,
    MachineInfo,
    confirmation,
  },
  computed: {
    machines() {
      return this.$store.getters['machineStore/machines'];
    },
    editingMachine() {
      return this.machines.find((machine) => machine.id === this.editMachineId);
    },
    detailedMachine() {
      return this.$store.getters['machineStore/machineById'](this.displayDetailed);
    },
    fields() {
      return fields;
    },
  },
  data() {
    return {
      /** */
      addMachineDialog: false,
      /** */
      configDialog: false,
      /** */
      removeMachineDialog: false,
      /** */
      editMachineId: '',
      /** */
      tobeDeletedMachine: {},
      /** */
      confirmationText: 'Do you want to continue?',
      /** */
      displayDetailed: null,
      /** */
      addIsWaitingForBackend: false,
    };
  },
  methods: {
    /** */
    async addMachine(machine) {
      this.addIsWaitingForBackend = true;
      await this.$store.dispatch('machineStore/add', {
        machine: {
          ...machine,
          id: v4(),
          saved: true,
        },
      });
      this.addIsWaitingForBackend = false;
      this.addMachineDialog = false;
    },
    /** */
    updateMachine(machine) {
      this.$store.dispatch('machineStore/update', {
        machine: { ...machine, saved: true },
      });
      this.editMachineId = '';
    },
    /** */
    openRemoveMachineDialog(all, id) {
      this.tobeDeletedMachine.all = all;
      this.tobeDeletedMachine.id = id;
      this.removeMachineDialog = true;
    },
    /**
     * deletes a machine from the store
     * @param id - id of the machine that's to be deleted
     */
    async deleteMachine() {
      const { id } = this.tobeDeletedMachine;
      this.$store.dispatch('machineStore/remove', { id });

      this.removeMachineDialog = false;
      this.tobeDeletedMachine = {};
    },
    /** */
    setMachineSaved(machine) {
      this.$store.dispatch('machineStore/add', {
        machine,
      });
    },
    /**
     * Delete all saved machines, if the machine is currently available, return it to the discovered machines list
     */
    deleteAllSaved() {
      this.$store.getters['machineStore/machines']
        .filter((machine) => machine.saved)
        .map((machine) => machine.id)
        .forEach((id) => {
          this.tobeDeletedMachine = { id };
          this.deleteMachine();
        });
      this.removeMachineDialog = false;
      this.tobeDeletedMachine = {};
    },
    /** */
    connectedMachines(machines) {
      if (machines) {
        return machines.filter((machine) => machine.status === 'CONNECTED');
      }

      return [];
    },
    /** */
    toggleDisplayDetailed(machine) {
      if (this.displayDetailed === machine.id) {
        this.displayDetailed = null;
      } else {
        this.displayDetailed = machine.id;
      }
    },
    /** */
    elementInDisplayDetailed(machine) {
      return machine.id === this.displayDetailed;
    },
  },
  mounted() {
    engineNetworkInterface.startMachinePolling();
  },
  async beforeRouteLeave(to, from, next) {
    await engineNetworkInterface.stopMachinePolling();
    next();
  },
};
</script>
<style lang="scss">
/* https://sass-lang.com/documentation/syntax#scss */

.detailed {
  background-color: #f0f0f0;
  border-style: solid;
  border-color: lightgrey;
  border-left-width: 2px;
  border-right-width: 2px;
}

.detailedBottom {
  border-top-width: 0px;
  border-bottom-width: 2px;
}
</style>

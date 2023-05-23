<template>
  <div>
    <v-toolbar>
      <v-toolbar-title>Capabilities</v-toolbar-title>
      <v-spacer />
      <v-btn color="primary" @click="addCapabilityDialog = true">Add</v-btn>
    </v-toolbar>
    <AlertWindow :popupData="popupData" />

    <confirmation
      v-if="tobeDeletedCapability.all == true"
      :title="'delete all capabilities?'"
      :text="confirmationText"
      continueButtonText="Delete all"
      continueButtonColor="error"
      :show="removeCapabilityDialog"
      maxWidth="350px"
      @cancel="removeCapabilityDialog = false"
      @continue="deleteAllCapabilities"
    />
    <confirmation
      v-else
      :title="'delete the selected capability?'"
      :text="confirmationText"
      continueButtonText="Delete"
      continueButtonColor="error"
      :show="removeCapabilityDialog"
      maxWidth="350px"
      @cancel="removeCapabilityDialog = false"
      @continue="deleteCapability"
    />

    <v-dialog width="600px" eager v-model="parameterInformation">
      <InfoCard
        :title="'Detailed Information about the Parameter'"
        :information="clickedParameter"
        :filter="['name', 'schema', 'type', 'required', 'unit', 'default', 'subTypes']"
        @clicked-object="
          (object) => {
            clickedParameter = object;
          }
        "
        @cancel="parameterInformation = false"
      />
    </v-dialog>

    <v-dialog width="600px" eager v-model="machineInformation">
      <InfoCard
        :title="'Detailed Information about the Machine'"
        :information="clickedMachine"
        :filter="['name', 'ip', 'optionalName', 'id', 'description']"
        :map="{
          name: 'mDNS Name',
          ip: 'IP Address',
          optionalName: 'Name',
          id: 'ID',
          description: 'Description',
        }"
        @cancel="machineInformation = false"
      />
    </v-dialog>

    <!-- Create two Tables: one for all discovered capabilities
    (have one or more associated machines) and one for saved capabilities
    Capabilities are Grouped in Objects:
    { machineId: '...', capabilities: [...]}
    machineId is the id of the associated machine or '' if !mapByHost or there is no machine-->
    <v-container
      fluid
      v-for="(groupArray, index) in getSortedCapabilityGroups()"
      :key="'Container' + index"
    >
      <v-row justify="center" id="wrapper">
        <v-col class="text-center centered">
          <v-card>
            <v-subheader>{{ !index ? 'Discovered' : 'Saved' }}</v-subheader>
            <CapabilityForm
              :show="addCapabilityDialog"
              @cancel="addCapabilityDialog = false"
              @add="addCapability"
            />
            <CapabilityForm
              :show="!!editCapabilityId"
              :capability="editingCapability"
              @cancel="editCapabilityId = ''"
              @update="updateCapability"
            />

            <v-card-text>
              <v-switch
                v-if="index === 0"
                v-model="mapByHost"
                :label="`Group by Machine`"
                style="float: left; margin-top: 0"
              />
              <div class="d-flex justify-end align-center">
                <v-btn
                  :disabled="!elementInDisplayDetailed(groupToCapabilities(groupArray))"
                  small
                  @click="collapseAll(groupToCapabilities(groupArray))"
                >
                  Collapse All
                </v-btn>
                <v-btn
                  :disabled="!notAllInDisplayDetailed(groupToCapabilities(groupArray))"
                  small
                  @click="expandAll(groupToCapabilities(groupArray))"
                >
                  Expand All
                </v-btn>
              </div>
              <v-data-table
                :headers="fields"
                :items="
                  groupArray.length === 1 && groupArray[0].capabilities.length === 0
                    ? []
                    : groupArray
                "
                hide-default-footer
                style="clear: both"
              >
                <template v-slot:header="{ headers }">
                  <tr>
                    <th v-for="header in headers" :key="header.text">
                      <span
                        v-if="header.text === 'Capability'"
                        @click="
                          index === 0
                            ? (sortDiscovered = (sortDiscovered + 1) % 3)
                            : (sortSaved = (sortSaved + 1) % 3)
                        "
                      >
                        <v-icon
                          v-if="
                            (sortDiscovered === 0 && index === 0) || (sortSaved === 0 && index == 1)
                          "
                          small
                        >
                          mdi-arrow-up
                        </v-icon>
                        <v-icon
                          color="primary"
                          v-if="
                            (sortDiscovered === 1 && index === 0) ||
                            (sortSaved === 1 && index === 1)
                          "
                          small
                        >
                          mdi-arrow-down
                        </v-icon>
                        <v-icon
                          color="primary"
                          v-if="
                            (sortDiscovered === 2 && index === 0) ||
                            (sortSaved === 2 && index === 1)
                          "
                          small
                        >
                          mdi-arrow-up
                        </v-icon>
                        {{ header.text }}
                      </span>
                      <span v-else>{{ header.text }}</span>
                    </th>
                  </tr>
                </template>

                <template v-slot:item="{ item, headers }">
                  <tr style="text-align: center" v-if="item.machineId">
                    <td
                      :colspan="headers.length"
                      class="text-left"
                      style="background-color: rgb(196, 216, 245)"
                    >
                      <span class="font-weight-medium">Machine: </span>
                      <a
                        @click.prevent="
                          machineInformation = true;
                          clickedMachine = machinesByIds(item.machineId)[0];
                        "
                      >
                        {{
                          machinesByIds(item.machineId)[0].optionalName ||
                          machinesByIds(item.machineId)[0].name
                        }}
                      </a>
                    </td>
                  </tr>
                  <template v-for="(capability, index) in item.capabilities">
                    <tr
                      style="text-align: center"
                      @click="toggleDisplayDetailed(capability)"
                      :class="elementInDisplayDetailed([capability]) ? 'detailed detailedTop' : ''"
                      :key="item.machineId + 'overview' + index"
                    >
                      <td>{{ capability.name }}</td>
                      <td>
                        <span
                          v-for="(parameter, index) in capability.parameters"
                          :key="parameter + index"
                        >
                          <span :style="{ fontStyle: parameter.required ? 'normal' : 'italic' }">
                            {{ parameter.name }}
                            <span v-if="index != capability.parameters.length - 1">, </span>
                          </span>
                        </span>
                      </td>
                      <td>
                        <div>
                          <v-icon
                            class="mx-0"
                            @click.stop="editCapabilityId = capability.id"
                            color="primary"
                          >
                            mdi-pencil
                          </v-icon>
                          <v-icon
                            class="mx-0"
                            @click.stop="openDeleteCapabilityDialog(false, capability.id)"
                            color="error"
                          >
                            mdi-delete
                          </v-icon>
                        </div>
                      </td>
                    </tr>
                    <!--An additional row after each capability
                    containing detailed information about it, originally hidden-->
                    <tr :key="item.machineId + capability.name + 'Details'">
                      <td
                        :colspan="fields.length"
                        v-if="elementInDisplayDetailed([capability])"
                        class="detailed detailedBottom"
                      >
                        <CapabilityInfo
                          :capability="capability"
                          @machineClick="
                            machineInformation = true;
                            clickedMachine = $event;
                          "
                          @parameterClick="
                            parameterInformation = true;
                            clickedParameter = $event;
                          "
                          @openpopup="openpopup"
                        />
                      </td>
                    </tr>
                  </template>
                </template>
              </v-data-table>
              <div class="mt-3">* Optional parameters are displayed in <i>italic</i></div>
            </v-card-text>
            <v-btn
              v-if="index == 1"
              class="mb-3"
              color="error"
              small
              @click="openDeleteCapabilityDialog(true, 0, index)"
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
import * as R from 'ramda';
import { v4 } from 'uuid';
import { mapState } from 'vuex';
import CapabilityForm from '@/frontend/components/capabilities/CapabilityForm.vue';
import AlertWindow from '@/frontend/components/universal/Alert.vue';
import confirmation from '@/frontend/components/universal/Confirmation.vue';
import InfoCard from '@/frontend/components/capabilities/InformationCard.vue';
import CapabilityInfo from '@/frontend/components/capabilities/CapabilityInfo.vue';

/**
 * @module views
 */
/**
 * @memberof module:views
 * @module Vue:Capabilities
 *
 * @vue-computed machinelessCapabilities
 * @vue-computed capabilitiesWithMachine
 */
export default {
  components: {
    CapabilityForm,
    AlertWindow,
    InfoCard,
    CapabilityInfo,
    confirmation,
  },

  computed: {
    ...mapState({
      capabilities: (state) => state.capabilityStore.capabilities,
      editingCapability() {
        return R.find(R.propEq('id', this.editCapabilityId), this.capabilities);
      },
    }),
    machinelessCapabilities() {
      return this.$store.getters['capabilityStore/machinelessCapabilities'];
    },
    capabilitiesWithMachine() {
      return this.$store.getters['capabilityStore/capabilitiesWithMachine'];
    },
  },
  data() {
    return {
      addCapabilityDialog: false,
      /** */
      removeCapabilityDialog: false,
      /** */
      tobeDeletedCapability: {},
      /** */
      confirmationText: 'Do you want to continue?',
      /** 0: dont sort, 1: sort alphabetical (ascending), 2: sort alphabetical(descending)
       * @type {number}
       */
      sortDiscovered: 1,
      /** */
      sortSaved: 1,
      /** */
      editCapabilityId: '',
      /** */
      mapByHost: false,
      /** */
      displayDetailed: [],
      /** */
      machineInformation: false,
      /** */
      clickedMachine: {},
      /** */
      parameterInformation: false,
      /** */
      clickedParameter: {},
      /** */
      fields: [
        {
          value: 'name',
          text: 'Capability',
          align: 'center',
          sortable: true,
        },
        {
          value: 'parameters',
          text: 'Parameter*',
          align: 'center',
          sortable: false,
        },
        {
          text: '',
          align: 'center',
          sortable: false,
        },
      ],
      /** */
      popupData: {
        body: 'This is not a valid URL',
        display: 'none',
        color: 'error',
      },
    };
  },
  methods: {
    /**
     * returns an array of machines which have one of the given machineIds
     * @param ids an array of machineIds or a signle machineId
     */
    machinesByIds(ids) {
      if (!Array.isArray(ids)) {
        return [this.$store.getters['machineStore/machineById'](ids)];
      }
      return this.$store.getters['machineStore/machines'].filter((machine) =>
        ids.some((id) => machine.id === id)
      );
    },
    /** */
    addCapability(capability) {
      this.$store.dispatch('capabilityStore/add', {
        capability: { ...capability, id: v4() },
      });
      this.addCapabilityDialog = false;
    },
    /** */
    updateCapability(capability) {
      this.$store.dispatch('capabilityStore/update', {
        capability,
      });
      this.editCapabilityId = '';
    },
    /** */
    openDeleteCapabilityDialog(all, id, index) {
      this.tobeDeletedCapability.id = id;
      this.tobeDeletedCapability.index = index;
      this.tobeDeletedCapability.all = all;
      this.removeCapabilityDialog = true;
    },
    /** */
    deleteCapability() {
      const { id } = this.tobeDeletedCapability;
      this.$store.dispatch('capabilityStore/remove', { id });
      this.removeCapabilityDialog = false;
      this.tobeDeletedCapability = {};
    },
    /** */
    openpopup() {
      this.popupData.display = 'block';
    },
    /**
     * Delete all added capabilities from the store
     */
    deleteAllCapabilities() {
      const { index } = this.tobeDeletedCapability;
      // index 0: remove all capabilities with associated machines, 1: remove all capabilities without associated machines
      if (index === 0) {
        this.capabilitiesWithMachine
          .map((capability) => capability.id)
          .forEach((id) => {
            this.$store.dispatch('capabilityStore/remove', { id });
          });
      } else {
        this.machinelessCapabilities
          .map((capability) => capability.id)
          .forEach((id) => {
            this.$store.dispatch('capabilityStore/remove', { id });
          });
      }
      this.removeCapabilityDialog = false;
      this.tobeDeletedCapability = {};
    },
    /**
     * Show/hide detailed information about the clicked capability
     * by saving/removing the capability from an array where we
     * store the capabilities which have their detailed info visible
     *
     * @param capability - The capability item we want to show additional info about
     */
    toggleDisplayDetailed(capability) {
      if (this.displayDetailed.some((value) => value === capability.id)) {
        this.displayDetailed = this.displayDetailed.filter((value) => value !== capability.id);
      } else {
        this.displayDetailed.push(capability.id);
      }
    },
    /**
     * Hide detailed info about all capabilities of the given array
     * @param capabilities - array of capabilities whos ids are to be removed from displayDetailed
     */
    collapseAll(capabilities) {
      this.displayDetailed = this.displayDetailed.filter((el) =>
        capabilities.every((capability) => capability.id !== el)
      );
    },
    /**
     * Show detailed information about all capabilities
     * @param capabilities - array of capabilities whos id is to be added to displayDetailed
     */
    expandAll(capabilities) {
      capabilities.forEach((capability) => {
        if (!this.displayDetailed.includes(capability.id)) {
          this.displayDetailed.push(capability.id);
        }
      });
    },
    /**
     *  Splits the map returned by the capabilityStore getter map into two arrays and sorts if necessary: 1. noMachine, 2. map without noMachine
     *  noMachine: all Capabilities that are not associated with a machine
     */
    getSortedCapabilityGroups() {
      const map = this.$store.getters['capabilityStore/map'](this.mapByHost);
      const unMapped = map.find((el) => el.machineId === '');

      const noMachine = unMapped.capabilities.filter((el) => !el.machineIds.length);

      unMapped.capabilities = unMapped.capabilities.filter((el) => !noMachine.includes(el));
      if (this.sortDiscovered !== 0) {
        map.forEach((el) => {
          el.capabilities.sort((capA, capB) => {
            let comp = 0;
            const nameA = capA.name.split('/').pop();
            const nameB = capB.name.split('/').pop();
            if (nameA.toLowerCase() < nameB.toLowerCase()) {
              comp = -1;
            } else if (nameA.toLowerCase() > nameB.toLowerCase()) {
              comp = 1;
            }

            if (this.sortDiscovered === 2) {
              comp *= -1;
            }
            return comp;
          });
        });
      }

      if (this.sortSaved !== 0) {
        noMachine.sort((capA, capB) => {
          let comp = 0;
          const nameA = capA.name.split('/').pop();
          const nameB = capB.name.split('/').pop();
          if (nameA.toLowerCase() < nameB.toLowerCase()) {
            comp = -1;
          } else if (nameA.toLowerCase() > nameB.toLowerCase()) {
            comp = 1;
          }

          if (this.sortSaved === 2) {
            comp *= -1;
          }
          return comp;
        });
      }

      return [map, [{ machineId: '', capabilities: noMachine }]];
    },
    /**
     * returns an array containing all capabilities inside the
     * groupArray (can contain duplicates)
     * [test](https://www.google.de) und `[{ machineId: 'id of machine or ""', capabilities: [...]},...]`
     *
     * @param { Array<{machineId: string, capabilities: Array }> } groupArray
     */
    groupToCapabilities(groupArray) {
      return groupArray.map((el) => el.capabilities).flat();
    },
    /** */
    elementInDisplayDetailed(capabilities) {
      return capabilities.some((el) => this.displayDetailed.includes(el.id));
    },
    /**
     *
     */
    notAllInDisplayDetailed(capabilities) {
      return capabilities.some((el) => !this.displayDetailed.includes(el.id));
    },
  },
};
</script>

<style lang="scss">
/* https://sass-lang.com/documentation/syntax#scss */

.v-table__overflow {
  width: 98%;
  overflow-x: auto;
  overflow-y: hidden;
}

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

.detailedTop {
  border-top-width: 2px;
  border-bottom-width: 0px !important;
}
</style>

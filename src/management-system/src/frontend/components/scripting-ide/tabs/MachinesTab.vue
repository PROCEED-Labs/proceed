<template>
  <v-list subheader two-line expand dense>
    <v-subheader>
      <v-text-field v-model="capabilityFilter" prepend-icon="mdi-magnify" placeholder="filter" />
    </v-subheader>

    <v-list-group
      v-for="machine in machinesFiltered"
      v-model="machine.active"
      :key="machine.name"
      prepend-icon="mdi-cellphone-link"
      no-action
    >
      <template v-slot:activator>
        <v-list-item>
          <v-list-item-content>
            <v-list-item-title>{{ machine.name }}</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </template>
      <template v-if="machine.capabilities">
        <v-list-item
          v-for="capability in machine.capabilities"
          :key="machine.name + capability.name"
        >
          <v-list-item-content @click="insertCapability(capability)">
            <v-list-item-title
              :class="isCapabilityDetected(capability) ? 'capability-detected' : ''"
            >
              {{ capability.name }}
            </v-list-item-title>
            <v-list-item-subtitle>
              <span
                v-for="parameter in capability.parameters"
                :key="capability.name + parameter.name"
              >
                {{ parameter.name }}<span v-if="parameter.required">*</span>,
              </span>
            </v-list-item-subtitle>
          </v-list-item-content>
          <v-list-item-action>
            <v-dialog eager width="600">
              <template v-slot:activator="{ on }">
                <v-btn icon ripple v-on="on" @click.stop="">
                  <v-icon color="grey">mdi-alert-circle</v-icon>
                </v-btn>
              </template>
              <v-card>
                <v-card-title class="headline grey lighten-2" primary-title>
                  Capability {{ capability.name }}
                </v-card-title>
                <v-card-text>
                  <table class="v-table theme--light">
                    <tbody>
                      <tr v-if="capability.name">
                        <th>Name</th>
                        <td v-text="capability.name"></td>
                      </tr>
                      <tr v-if="capability.schema">
                        <th>Schema</th>
                        <td>
                          <a :href="capability.schema" target="_blank" v-text="capability.schema" />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <v-textarea
                    :value="createCapabilityFunctionString(capability, code)"
                    label="Sample code"
                  />
                  <div v-if="capability.parameters && capability.parameters.length">
                    <h2>Parameters</h2>

                    <div
                      v-for="parameter in capability.parameters"
                      :key="capability.name + parameter.name"
                    >
                      <h3 v-text="parameter.name"></h3>
                      <table class="v-table theme--light">
                        <tbody>
                          <tr v-if="parameter.name">
                            <th>Name</th>
                            <td v-text="parameter.name"></td>
                          </tr>
                          <tr v-if="parameter.schema">
                            <th>Schema</th>
                            <td>
                              <a
                                :href="parameter.schema"
                                v-text="parameter.schema"
                                target="_blank"
                              />
                            </td>
                          </tr>
                          <tr v-if="parameter.type">
                            <th>Type</th>
                            <td v-text="parameter.type"></td>
                          </tr>
                          <tr v-if="parameter.unit">
                            <th>Unit</th>
                            <td v-text="parameter.unit"></td>
                          </tr>
                          <tr v-if="parameter.encoding">
                            <th>Encoding</th>
                            <td v-text="parameter.encoding"></td>
                          </tr>
                          <tr v-if="parameter.default">
                            <th>Default Value</th>
                            <td v-text="parameter.default"></td>
                          </tr>
                          <tr v-if="parameter.required">
                            <th>Required</th>
                            <td v-text="parameter.required ? 'required' : 'optional'" />
                          </tr>
                          <tr v-if="parameter.validators && parameter.validators.length">
                            <th>Validation Rules</th>
                            <td>
                              <ul>
                                <li
                                  v-for="validator in parameter.validators"
                                  :key="capability.name + validator.type"
                                >
                                  {{ validator.type }}:
                                  {{ validator.rule }}
                                </li>
                              </ul>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </v-card-text>
              </v-card>
            </v-dialog>
          </v-list-item-action>
        </v-list-item>
      </template>
    </v-list-group>
  </v-list>
</template>

<script>
import {
  createCapabilityFunctionString,
  isCapabilitySuitableForParameters,
} from '@/frontend/helpers/script-editor-helper.js';

export default {
  props: {
    detectedCapabilities: Array,
    readonly: Boolean,
    code: String,
  },

  data() {
    return {
      capabilityFilter: '',
      machines: this.$store.getters['capabilityStore/map'](true),
    };
  },

  methods: {
    insertCapability(capability) {
      this.$emit('insert', createCapabilityFunctionString(capability, this.code));
    },

    isCapabilityDetected(capability) {
      return (
        this.detectedCapabilities.filter(
          (detectedCapability) =>
            (detectedCapability.name === capability.name ||
              detectedCapability.name === capability.schema) &&
            isCapabilitySuitableForParameters(capability, detectedCapability.parameters),
        ).length > 0
      );
    },

    createCapabilityFunctionString(capability) {
      return createCapabilityFunctionString(capability, this.code);
    },
  },

  computed: {
    machinesFiltered() {
      const self = this;
      return this.machines.map((machine) => {
        const myMachine = this.$store.getters['machineStore/machineById'](machine.machineId);
        this.machines.forEach((machine) => {
          machine.capabilities.forEach((capability) => {
            if (!capability.parameters) {
              capability.parameters = [];
            }
          });
        });
        return {
          active: true,
          name: myMachine ? myMachine.name : 'Not available right now:',
          capabilities: machine.capabilities
            ? machine.capabilities.filter((capability) =>
                capability.name.includes(self.capabilityFilter),
              )
            : [],
        };
      });
    },

    /**
     * return a list of all capabilities available
     */
    capabilities() {
      return [].concat.apply(
        [],
        this.machines.map((e) => (e.capabilities ? e.capabilities : [])),
      );
    },
  },

  /**
   * On mount:
   * - send list of all available machines upwards
   */
  mounted() {
    this.$emit('machineListUpdated', this.machines);
  },
};
</script>

<style>
.capability-detected {
  background-color: #bbdefb;
}
</style>

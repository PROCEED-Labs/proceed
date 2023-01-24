<template>
  <div>
    <v-list subheader expand dense>
      <v-subheader>
        <v-text-field v-model="capabilityFilter" prepend-icon="mdi-magnify" placeholder="filter" />
      </v-subheader>
      <v-divider />
      <v-subheader>Required capabilities and parameters</v-subheader>
      <v-list-group
        v-for="capability in capabilitiesFiltered"
        v-model="capability.active"
        :key="capability.name + '-' + capability.timestamp"
        prepend-icon="mdi-controller-classic"
        no-action
      >
        <template v-slot:activator>
          <v-list-item>
            <v-list-item-content>
              <v-list-item-title>{{ capability.name }}</v-list-item-title>
            </v-list-item-content>
            <v-list-item-action v-show="!readonly">
              <v-tooltip eager bottom>
                <template v-slot:activator="{ on }">
                  <v-btn icon ripple v-on="on" @click.stop="removeCapability(capability)">
                    <v-icon color="grey lighten-1">mdi-delete</v-icon>
                  </v-btn>
                </template>
                <span>Remove capability</span>
              </v-tooltip>
            </v-list-item-action>
          </v-list-item>
        </template>
        <v-list-item v-for="parameter in capability.parameters" :key="parameter">
          <v-list-item-action v-show="!readonly">
            <v-tooltip eager bottom>
              <template v-slot:activator="{ on }">
                <v-btn icon ripple v-on="on" @click.stop="removeParameter(capability, parameter)">
                  <v-icon color="grey lighten-1">mdi-delete</v-icon>
                </v-btn>
              </template>
              <span>Remove from required parameters</span>
            </v-tooltip>
          </v-list-item-action>
          <v-list-item-content>
            <v-list-item-title>
              {{ parameter }}
            </v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item v-show="!readonly">
          <v-text-field
            v-model="capability.newParameterName"
            append-icon="mdi-plus"
            placeholder="add required parameter"
            @click:append="uiAddParameter(capability)"
            @keyup.enter="uiAddParameter(capability)"
          />
        </v-list-item>
      </v-list-group>
      <v-list-item v-show="!readonly">
        <v-text-field
          v-model="newCapabilityName"
          prepend-icon="mdi-controller-classic"
          append-icon="mdi-plus"
          placeholder="add required capability"
          @click:append="uiAddCapability"
          @keyup.enter="uiAddCapability"
        />
      </v-list-item>
      <v-divider />
    </v-list>
    <v-list subheader dense two-line="">
      <v-subheader>Suggestions from your code</v-subheader>
      <v-list-item
        v-for="capability in detectedCapabilitiesNotInList"
        :key="capability.name + '-' + capability.parameters.join('-')"
      >
        <v-list-item-action v-show="!readonly">
          <v-tooltip eager bottom>
            <template v-slot:activator="{ on }">
              <v-btn
                icon
                ripple
                v-on="on"
                @click.stop="addCapability(capability.name, capability.parameters)"
              >
                <v-icon color="grey lighten-1">mdi-plus</v-icon>
              </v-btn>
            </template>
            <span>Add to list of required capabilities</span>
          </v-tooltip>
        </v-list-item-action>
        <v-list-item-content>
          <v-list-item-title v-text="capability.name"></v-list-item-title>
          <v-list-item-subtitle>
            <span v-for="parameter in capability.parameters" :key="parameter">
              {{ parameter }},
            </span>
          </v-list-item-subtitle>
        </v-list-item-content>
      </v-list-item>
    </v-list>
  </div>
</template>

<script>
import * as R from 'ramda';

export default {
  props: {
    /**
     * Capabilities deteced in code.
     */
    detectedCapabilities: Array,

    /**
     * Capabilities required by the open item.
     */
    requiredCapabilities: Array,

    /**
     * If readonly, can not be manipulated
     */
    readonly: Boolean,
  },

  data() {
    return {
      capabilityFilter: '',
      newCapabilityName: '',
      capabilities: [],
    };
  },

  methods: {
    /**
     * Wrapper for addParameter function to be called from the UI.
     */
    uiAddParameter(capability) {
      this.addParameter(capability, capability.newParameterName);
      capability.newParameterName = '';
    },

    /**
     * Wrapper for addCapability function to be called from the UI.
     */
    uiAddCapability() {
      this.addCapability(this.newCapabilityName);
      this.newCapabilityName = '';
    },

    /**
     * Add a capability to the list.
     *
     * @param name: String
     * @param parameters: [String] - optional
     * @returns Object
     */
    addCapability(name, parameters) {
      const capability = {
        name,
        parameters: parameters && parameters.length ? parameters : [],
        timestamp: Date.now(), // used for unique key
      };
      this.capabilities.push(capability);

      this.updateParentComponent();
      return capability;
    },

    /**
     * Remove a capability from the list.
     *
     * @param capability: Object
     * @returns void
     */
    removeCapability(capability) {
      if (!capability) {
        return;
      }

      this.capabilities = R.difference(this.capabilities, [capability]);

      this.updateParentComponent();
    },

    /**
     * Add a parameter as required to a capability.
     *
     * @param capability: Object - reference to the capability object in question
     * @parameterName: String - name of the parameter to add
     * @returns void
     */
    addParameter(capability, parameterName) {
      if (!capability || !parameterName) {
        return;
      }

      this.removeParameter(capability, parameterName);
      capability.parameters.push(parameterName);

      this.updateParentComponent();
    },

    /**
     * Remove a parameter from a capability.
     *
     * @param capability: Object - reference to the capability object in question
     * @param parameterName: String - name of the parameter to remove
     * @returns void
     */
    removeParameter(capability, parameterName) {
      if (!capability || !parameterName) {
        return;
      }

      capability.parameters = R.without(parameterName)(capability.parameters);

      this.updateParentComponent();
    },

    /**
     * Emit event to notify parent component about changed capability mapping.
     */
    updateParentComponent() {
      this.$emit('requiredParametersUpdated', this.unifyCapabilities(this.capabilities));
    },

    /**
     * Unify capabilities and parameters to strip unnecessary properties and sort parameters.
     * This enables comparability for example.
     */
    unifyCapabilities(capabilities) {
      return capabilities.map(({ name, parameters }) => ({ name, parameters: parameters.sort() }));
    },
  },

  computed: {
    /**
     * Filter capabilities by search string, and
     * expand all list groups by default (active=true).
     *
     * @returns {*}
     */
    capabilitiesFiltered() {
      return this.capabilities
        .filter((capability) => capability.name.includes(this.capabilityFilter))
        .map((capability) => {
          capability.active = true;
          return capability;
        });
    },

    /**
     * Returns a list of capabilities detected which are not yet present
     * in the capabilities list with the exact same parameters.
     */
    detectedCapabilitiesNotInList() {
      // unify both lists to make them comparable
      // 1. drop all other object keys than name and parameters
      // 2. sort parameters array alphabetically
      const list = this.unifyCapabilities(this.capabilities);
      const detected = this.unifyCapabilities(this.detectedCapabilities);

      return R.difference(detected, list);
    },
  },

  watch: {
    /**
     * Update (replace) the local capability store when it changes from outside.
     *
     * @param newValue
     */
    requiredCapabilities(newValue) {
      this.capabilities = newValue;
    },
  },
};
</script>

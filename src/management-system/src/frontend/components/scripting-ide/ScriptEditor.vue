<template>
  <v-row no-gutters style="height: 100%" class="editor-tab">
    <v-col sm="9" class="ide-column ide-column-editor">
      <!-- MONACO EDITOR -->
      <monaco-editor
        :value="value"
        :suggestions="suggestions"
        :messages="messages"
        :reload-flag="reloadFlag"
        :readonly="readonly"
        :elementId="openElementId"
        :process-definitions-id="processDefinitionsId"
        @input="inputDetected($event)"
        ref="editor"
      />
    </v-col>

    <!-- SIDEBAR -->
    <v-col sm="3" class="ide-column ide-column-sidebar" v-show="openElementId">
      <!-- TABS -->
      <v-tabs :center-active="false" v-model="activeTab" light>
        <!-- CAPABILITIES TAB, hidden for now -->
        <!--v-tab key="tabCapabilities" ripple> Capas </v-tab>
        <v-tab-item key="tabCapabilities">
          <v-card flat>
            <capabilities-tab
              :required-capabilities="capabilities"
              :detected-capabilities="detectedCapabilities"
              :readonly="readonly"
              @requiredParametersUpdated="requiredParametersUpdated($event)"
              @insert="insert($event)"
            />
          </v-card>
        </v-tab-item-->

        <!-- VARIABLES TAB -->
        <v-tab key="tabVariables" ripple v-show="!readonly"> Variables </v-tab>
        <v-tab-item key="tabVariables">
          <v-card flat>
            <variables-tab
              v-show="!readonly"
              :process-definitions-id="processDefinitionsId"
              :code="computedCode"
              @insert="insert($event)"
            />
          </v-card>
        </v-tab-item>

        <!-- MACHINES TAB, hidden for now -->
        <!--v-tab v-if="false" key="tabMachines" ripple> Machines </v-tab>
        <v-tab-item key="tabMachines">
          <v-card flat>
            <machines-tab
              :detected-capabilities="detectedCapabilities"
              :readonly="readonly"
              :code="computedCode"
              @machineListUpdated="machineListUpdated"
              @insert="insert($event)"
            />
          </v-card>
        </v-tab-item-->
      </v-tabs>
    </v-col>
  </v-row>
</template>

<script>
import MonacoEditor from '@/frontend/components/scripting-ide/MonacoEditor.vue';
import VariablesTab from '@/frontend/components/scripting-ide/tabs/VariablesTab.vue';
import MachinesTab from '@/frontend/components/scripting-ide/tabs/MachinesTab.vue';
import CapabilitiesTab from '@/frontend/components/scripting-ide/tabs/CapabilitiesTab.vue';
import {
  debounce,
  parseCapabilitiesFromCode,
  createCapabilityFunctionString,
  createCapabilityParameterString,
  createVariableGetFunctionString,
  findCapabilitiesByName,
  isCapabilitySuitableForParameters,
} from '@/frontend/helpers/script-editor-helper.js';

export default {
  components: {
    MonacoEditor,
    VariablesTab,
    // MachinesTab,
    // CapabilitiesTab,
  },

  props: {
    processDefinitionsId: String,
    value: String,
    reloadFlag: [String, Number],
    readonly: Boolean,
    openElementId: String,
  },

  computed: {
    /**
     * Returns the capability mapping of the currently open open element.
     */
    capabilities() {
      return this.$store.getters['processEditorStore/capabilitiesOfElement'](this.openElementId);
    },

    /**
     * Returns a list of all capabilities with all parameters
     * detected in all machines in the environment.
     */
    capabilitiesInEnvironment() {
      return [].concat(...this.machines.map((machine) => machine.capabilities || []));
    },

    /**
     * Returns the process variables for the currently open process.
     */
    variables() {
      return this.$store.getters['processStore/processById'](this.processDefinitionsId).variables;
    },
  },

  data() {
    return {
      /**
       * The currently open tab in the sidebar
       */
      activeTab: null,

      /**
       * A list of capabilities detected in the code
       */
      detectedCapabilities: [],
      /**
       * The local cache of the machine list available in the network.
       */
      machines: [],

      /**
       * Storing available autocomplete suggestions for the code.
       */
      suggestions: [],

      /**
       * Storing messages to be displayed about the current code.
       */
      messages: [],
      computedCode: '',
    };
  },

  watch: {
    /**
     * Whenever the code of the editor changes,
     * run analysis on it and generate errors, messages, suggestions, etc.
     *
     * @returns void
     */
    value() {
      debounce(this.analyzeCode, 300)();
    },

    /**
     * Analyze code whenever a new file is opened.
     */
    reloadFlag() {
      this.analyzeCode();
    },
  },

  methods: {
    /**
     * Insert text into the editor at the given cursor.
     * Abort if the currently opened document is read-only.
     */
    insert(text) {
      if (this.readonly) {
        return;
      }
      this.$refs.editor.insert(text);
    },
    /**
     * content changed
     */
    inputDetected(event) {
      this.computedCode = event.code;
      this.$emit('input', event);
    },
    /**
     * Whenever the code of the editor changes,
     * run analysis on it and generate errors, messages, suggestions, etc.
     *
     * @returns void
     */
    analyzeCode() {
      this.detectCapabilities();
      this.refreshSuggestions();
      this.updateMessages();
    },

    /**
     * Parse the code for capability calls.
     * Parse their name and the parameters used.
     *
     * @returns void
     */
    detectCapabilities() {
      this.detectedCapabilities = parseCapabilitiesFromCode(this.value);
    },
    /**
     * Generate editor suggestions from various sources.
     */
    refreshSuggestions() {
      let suggestions = [];

      // get capability suggestions from machines
      this.machines.forEach((machine) => {
        suggestions = suggestions.concat(
          machine.capabilities.map((capability) => ({
            label: capability.name,
            insertText: createCapabilityFunctionString(capability, this.value),
            detail: createCapabilityParameterString(capability),
            kind: 'Function',
          }))
        );
      });

      // get variable suggestions from variables tab
      suggestions = suggestions.concat(
        this.variables.map((variable) => ({
          label: variable.name,
          insertText: createVariableGetFunctionString(variable, this.computedCode),
          detail: variable.type,
          kind: 'Variable',
        }))
      );

      // todo: get function suggestions from library

      // update data
      this.suggestions = suggestions;
    },

    /**
     * Create all messages for the editor.
     *
     * @returns void
     */
    updateMessages() {
      const messages = [];

      // check if there is at least one capability in the environment
      // which can be satisfied by any capability started in the code
      // otherwise display a message about that
      this.detectedCapabilities
        .filter((detectedCapability) => {
          let cannotFindInstance = true;

          findCapabilitiesByName(this.capabilitiesInEnvironment, detectedCapability.name).forEach(
            (capability) => {
              if (isCapabilitySuitableForParameters(capability, detectedCapability.parameters)) {
                cannotFindInstance = false;
              }
            }
          );

          return cannotFindInstance;
        })
        .forEach((capability) => {
          messages.push({
            line: capability.line,
            type: 'warning',
            message: `Cannot find suitable capability in environment to execute capability "${capability.name}" (if in doubt check parameters)`,
          });
        });

      this.messages = messages;
    },

    /**
     * Update the required capability parameters.
     *
     * @param capabilities
     */
    requiredParametersUpdated(capabilities) {
      // commit to store
      this.$store.dispatch('processEditorStore/setElementCapabilityMapping', {
        elementId: this.openElementId,
        capabilities,
      });
    },

    /**
     * When there is an updates machine list available.
     *
     * @param machines
     */
    machineListUpdated(machines) {
      this.machines = machines;
      this.analyzeCode();
    },
  },

  mounted() {
    // analyze the code once on startup
    this.analyzeCode();
  },
};
</script>

<style>
.ide-column.ide-column-editor {
  overflow: hidden;
}
</style>

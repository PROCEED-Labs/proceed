<template>
  <v-carousel
    show-arrows-on-hover
    hide-delimiters
    height="100%"
    :show-arrows="hasWarnings && currentData.warnings.length > 1"
    :continuous="false"
  >
    <v-carousel-item v-for="(warning, index) in sortedWarnings" :key="index">
      <v-alert
        id="process-form-warning-alert"
        dark
        :type="warning.resolved ? 'success' : warning.severity"
        :color="warning.severity"
        prominent
      >
        <div class="message-box">
          {{ warning.message }}
        </div>

        <div v-if="!warning.resolved">
          <div class="button-box" v-if="warning.type === 'process_override'">
            <v-btn color="primary" @click="overrideProcess(warning.data)"
              >Override existing process</v-btn
            >
            <v-btn color="primary" @click="importAsNewProcess(warning)"
              >Import as new process</v-btn
            >
          </div>
          <div class="button-box" v-if="warning.type === 'userTask_conflict'">
            <v-tooltip v-model="showHtml">
              <html-preview :html="html" />
            </v-tooltip>
            <v-btn
              class="htmlButton"
              color="primary"
              @click="resolveHtmlConflict(warning, 'existing')"
              @mouseenter="
                html = warning.data.existing.html;
                showHtml = true;
              "
              @mouseleave="
                html = '';
                showHtml = false;
              "
            >
              Use existing html
            </v-btn>

            <v-btn
              class="htmlButton"
              color="primary"
              @click="resolveHtmlConflict(warning, 'provided')"
              @mouseenter="
                html = warning.data.provided.html;
                showHtml = true;
              "
              @mouseleave="
                html = '';
                showHtml = false;
              "
            >
              Use new html
            </v-btn>
          </div>
          <div class="button-box" v-if="warning.type === 'derived_process_override'">
            <v-btn color="primary" @click="giveDerivedOverrideOptions(warning)"
              >Override existing process</v-btn
            >
            <v-btn color="primary" @click="importAsNewProcess(warning)"
              >Import as new process</v-btn
            >
          </div>
          <div class="button-box" v-if="warning.type === 'derived_process_override_selection'">
            <v-select
              v-model="selectedProcess"
              :items="warning.data"
              item-text="name"
              return-object
            ></v-select>
            <v-btn
              color="primary"
              :disabled="!selectedProcess"
              @click="overrideProcess(selectedProcess.id)"
              >Override Process</v-btn
            >
          </div>
        </div>
        <div v-else class="button-box">
          <v-btn disabled>Resolved: {{ warning.resolveMessage }}</v-btn>
        </div>
      </v-alert>
    </v-carousel-item>
  </v-carousel>
</template>
<script>
import HtmlPreview from './HtmlPreview.vue';
import processesDataInjectorMixin from './ProcessesDataInjectorMixin.vue';
import onSubmitInjectorMixin from './OnSubmitInjectorMixin.vue';

import { toListString } from '@/shared-frontend-backend/helpers/arrayHelpers.js';

import {
  generateDefinitionsId,
  getDefinitionsAndProcessIdForEveryCallActivity,
} from '@proceed/bpmn-helper';

/**
 * Used to store some information for import analysis
 */
class MetaWarning {
  /**
   * Creates a new MetaWarnign object
   *
   * @param {String} message information about the problem aimed at the end user
   * @param {String} type what kind of problem this is
   * @param {String} color what kind of color this warning might be displayed with
   */
  constructor(message, type, severity = 'warning') {
    this.message = message || '';
    this.type = type;
    this.severity = severity;
    this.solution = '';
    this.resolved = false;
    this.resolveMessage = '';
    this.data = undefined;
  }

  /**
   * Sets the warning to being resolved with a given solution
   *
   * @param {String} solution the solution that is to be used to resolve the warning
   * @param {String} resolveMessage optional message for displaying to the end user
   */
  resolve(solution, resolveMessage) {
    if (!solution) {
      throw new Error('Must provide a solution when resolving an error!');
    }
    this.solution = solution;
    this.resolved = true;
    this.resolveMessage = resolveMessage;
    this.severity = 'success';
  }
}

export default {
  mixins: [processesDataInjectorMixin, onSubmitInjectorMixin],
  props: {
    // used for v-model
    value: {
      type: Boolean,
      required: true,
    },
    currentIndex: {
      type: Number,
      required: true,
    },
    currentData: {
      type: Object,
      default: () => ({}),
    },
  },
  components: { HtmlPreview },
  data() {
    return {
      selectedProcess: null,
      html: '',
      showHtml: false,
    };
  },
  computed: {
    hasWarnings() {
      return !!(this.currentData.warnings && this.currentData.warnings.length);
    },
    sortedWarnings() {
      if (!this.hasWarnings) {
        return [];
      }

      const sorted = [...this.currentData.warnings];
      sorted.sort((a, b) => {
        // sort in a way that unresolved warnings come first
        if (!a.resolved && b.resolved) {
          return -1;
        }

        if (a.resolved && !b.resolved) {
          return 1;
        }

        // show more severe problems first and less severe after
        const severityMap = { error: 0, warning: 1, success: 2 };
        return severityMap[a.severity] - severityMap[b.severity];
      });

      return sorted;
    },
  },
  methods: {
    giveDerivedOverrideOptions(warning) {
      warning.type = 'derived_process_override_selection';
    },
    /**
     * Sets the process override warning to be resolved with import as new process and sends signal to ProcessForm
     *
     * @param {Object} warning the process override warning to resolve
     */
    importAsNewProcess() {
      this.updateData(this.currentIndex, {
        id: generateDefinitionsId(),
      });
    },
    overrideProcess(definitionsId) {
      this.updateData(this.currentIndex, {
        id: definitionsId,
        originalStoredProcessId: definitionsId,
      });
    },
    resolveHtmlConflict(warning, chosenOption) {
      const newHtmlData = new Map();

      this.currentData.htmlData.forEach((htmlOptions, fileName) => {
        if (fileName === warning.fileName) {
          htmlOptions[chosenOption].chosen = true;
        }
        newHtmlData.set(fileName, htmlOptions);
      });

      this.updateData(this.currentIndex, {
        htmlData: newHtmlData,
      });
    },
    /**
     * Will create the warnings that will be displayed for the current state of a form entry
     *
     * @param {Object} currentData the current state of the entry
     * @param {Object} changes the changes that will be applied to the entry
     *
     * @returns {Array} all the warnings to display for the entry
     */
    calculateWarnings(currentData, changes) {
      const newWarnings = [];

      // merge current data with the changes to get the state for which we want to create warnings
      const merge = { ...currentData, ...changes };

      // Check if there is a process that might be target for a override
      if (merge.possibleOverrideProcess) {
        const overrideProcess = this.$store.getters['processStore/processById'](
          merge.possibleOverrideProcess
        );

        const overrideWarning = new MetaWarning(
          `- You are importing a process that seems to already exist. The following process would be overwritten: ${overrideProcess.name}`,
          'process_override',
          'error'
        );

        overrideWarning.data = merge.possibleOverrideProcess;

        // check if the warning is already resolved
        if (merge.id) {
          if (merge.id === merge.possibleOverrideProcess) {
            overrideWarning.resolve(
              'override_process',
              `Process ${overrideProcess.name} will be overwritten!`
            );
          } else {
            overrideWarning.resolve('make_new_process', 'Process will be imported as new one!');
          }
        }

        newWarnings.push(overrideWarning);
      }

      // check if there are processes that might be derived from the process and could be supposed to be overwritten
      if (Array.isArray(merge.possibleDerivedProcesses) && merge.possibleDerivedProcesses.length) {
        const possibleProcesses = merge.possibleDerivedProcesses.map((id) => ({
          id,
          name: this.$store.getters['processStore/processById'](id).name,
        }));

        // create warning that informs the user that he has to decide how to handle the import (override one of the derived processes/import as new process)
        const possibleProcessNames = possibleProcesses.map(({ name }) => name);
        const derivedNames = toListString(possibleProcessNames, 3);

        const derrivedWarning = new MetaWarning(
          `- You are importing a process that seems to have been imported before. The following processes might be derived from that process: ${derivedNames}.`,
          'derived_process_override'
        );

        derrivedWarning.data = possibleProcesses;

        // Check if the warning was already resolved by selecting a process to override or by choosing to import as a new process
        if (merge.id) {
          const overrideProcess = possibleProcesses.find((p) => p.id === merge.id);
          if (overrideProcess) {
            derrivedWarning.resolve(
              'override_process',
              `Process ${overrideProcess.name} will be overwritten!`
            );
          } else {
            derrivedWarning.resolve('make_new_process', 'Process will be imported as new one!');
          }
        }

        newWarnings.push(derrivedWarning);
      }

      if (merge.htmlData) {
        merge.htmlData.forEach(({ provided, existing }, fileName) => {
          // check if there is an html conflict were either a user provided html or an existing html could be chosen
          if (provided && existing) {
            const conflictWarning = new MetaWarning(
              `There is already existing html as well as imported html for ${fileName}! Which one should be used?`,
              'userTask_conflict',
              'error'
            );

            conflictWarning.data = { provided, existing };
            conflictWarning.fileName = fileName;

            // check if the warning was already resolved by choosing one of the html files
            if (provided.chosen || existing.chosen) {
              conflictWarning.resolve(
                'html_conflict_resolved',
                `Will use the ${provided.chosen ? 'new' : 'existing'} html!`
              );
            }

            newWarnings.push(conflictWarning);
          }
        });
      }

      // check if there are callactivities referencing processes that don't exist
      if (merge.callActivitiesNotFound && merge.callActivitiesNotFound.length) {
        merge.callActivitiesNotFound;

        const warning = new MetaWarning(
          '- The process references callActivities, which are not present in the PROCEED Management System: "' +
            toListString(merge.callActivitiesNotFound) +
            '". Make sure to add them before you execute this process.',
          'subprocesses_missing'
        );

        // there is nothing to do; the user is just notified
        warning.resolve('add_later', 'Add them later');
        warning.severity = 'warning';

        newWarnings.push(warning);
      }

      if (Array.isArray(merge.userTasks)) {
        merge.userTasks.forEach((userTask) => {
          if (userTask.additionalInfo === 'default') {
            // Notify the user that some tasks are missing html and that a default html will be added
            const warning = new MetaWarning(
              `No html for user task ${userTask.taskId} provided. Will add default html!`,
              'userTask_missing_html'
            );
            warning.resolve('default_html', 'No further actions needed!');
            newWarnings.push(warning);
          } else if (userTask.info === 'obsolete') {
            // notify the user, that there is html which will not be needed after the change and that it will therefore be removed
            let warning;

            if (userTask.usedBy) {
              const inflection = userTask.usedBy.length > 1 ? 'tasks' : 'task';

              const userTaskList = toListString(userTask.usedBy, 2);

              warning = new MetaWarning(
                `Html for user ${inflection} ${userTaskList} has become obsolete and will be deleted!`,
                'userTask_obsolete_html'
              );
            } else {
              warning = new MetaWarning(
                `User task stored in file ${userTask.taskFileName} is not used and will be deleted!`,
                'userTask_obsolete_html'
              );
            }

            warning.resolve('delete_html', 'No further actions needed!');
            newWarnings.push(warning);
          }
        });
      }

      return newWarnings;
    },
    /**
     * Will be called when the bpmn of an entry changes to check if there are processes referenced that don't exist
     *
     * @param {Object} changes the changes that will be applied to the current entry
     */
    async initProcessDataFromBPMN(_, changes) {
      const callActivitiesNotFound = [];
      const callActivitiesWithDefAndProcId = await getDefinitionsAndProcessIdForEveryCallActivity(
        changes.bpmn,
        true
      );
      Object.values(callActivitiesWithDefAndProcId).forEach(({ definitionId }) => {
        let process = this.processesData.find((p) => p.id === definitionId);

        if (!process && !this.$store.getters['processStore/processById'](definitionId)) {
          callActivitiesNotFound.push(definitionId);
        }
      });

      return { callActivitiesNotFound };
    },
    removeBPMNRelatedData() {
      return { callActivitiesNotFound: undefined, warnings: undefined };
    },
    watchOtherChanges(currentData, changes) {
      if (
        changes.hasOwnProperty('id') || // the process that this entry will write to has changed
        changes.hasOwnProperty('possibleOverrideProcess') || // the process that could be overwritten has changed
        changes.hasOwnProperty('possibleDerivedProcesses') || // the processes that could be derived from this one overwritten were changed
        changes.hasOwnProperty('userTasks') || // the user tasks data changed
        changes.hasOwnProperty('callActivitiesNotFound')
      ) {
        return { warnings: this.calculateWarnings(currentData, changes) };
      }

      return {};
    },
    async beforeSubmitValidation(entry) {
      if (entry.warnings && entry.warnings.some((warning) => !warning.resolved)) {
        throw new Error('There are still unresolved warnings!');
      }
    },
  },
  watch: {
    sortedWarnings(newValues) {
      // inform parent component that there are unresolved warnings
      // input to allow usage with v-model
      this.$emit(
        'input',
        newValues.some((warning) => !warning.resolved)
      );
    },
  },
};
</script>
<style scoped>
.v-alert {
  height: 100%;
  margin-bottom: 0;
}
.v-alert__content {
  display: flex;
  justify-content: baseline;
}
.button-box {
  display: flex;
}
.message-box {
  flex: 1 0 0;
}
.button-box > .v-btn {
  flex: 1 0 0;
}
.button-box > .v-select {
  flex: 1 0 0;
}
.v-card {
  height: 100%;
}
</style>

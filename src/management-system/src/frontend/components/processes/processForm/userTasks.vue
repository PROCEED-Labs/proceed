<template>
  <div></div>
</template>
<script>
import processesDataInjectorMixin from './ProcessesDataInjectorMixin.vue';
import onSubmitInjectorMixin from './OnSubmitInjectorMixin.vue';

import {
  toBpmnObject,
  toBpmnXml,
  getUserTaskFileNameMapping,
  generateUserTaskFileName,
  getElementById,
  getTaskConstraintMapping,
  addConstraintsToElementById,
  setUserTaskData,
  getAllUserTaskFileNamesAndUserTaskIdsMapping,
} from '@proceed/bpmn-helper';
import { defaultHtml, defaultCss } from '@/frontend/assets/user-task.js';

import { asyncForEach } from '@/shared-frontend-backend/helpers/javascriptHelpers.js';

import { getUpdatedTaskConstraintMapping } from '@/frontend/helpers/usertask-helper.js';

import { enable5thIndustryIntegration } from '../../../../../../../FeatureFlags';

/**
 * @module components
 */
/**
 * @memberof module:components
 * @module processes
 */
/**
 * This component handles the user task data inside the current entries of processesData
 *
 * @memberof module:components.module:processes
 * @module Vue:userTasks
 *
 */
export default {
  mixins: [processesDataInjectorMixin, onSubmitInjectorMixin],
  data() {
    return {
      beforeSubmitPriority: 500,
    };
  },
  methods: {
    /**
     * This function will update the htmlData inside the process entry using its already existing data
     *
     * It is called when specific attributes inside an entry have changed
     *
     * @param {Object} entry the entry to update the htmlData in
     */
    async calculateHtmlData(currentData) {
      // early exit if there is still ambiguity on how to handle the process itself
      if (
        !currentData.id &&
        (currentData.possibleOverrideProcess ||
          (currentData.possibleDerivedProcesses && currentData.possibleDerivedProcesses.length))
      ) {
        return currentData.htmlData;
      }

      const htmlData = new Map();

      // take over user provided htmlData if there is any
      if (currentData.htmlData) {
        currentData.htmlData.forEach((value, fileName) => {
          htmlData.set(fileName, { provided: { ...value.provided, info: 'user-provided' } });
        });
      }

      // if the current process entry is related to an existing process, import its html data
      if (currentData.originalStoredProcessId) {
        // get the html data from the store
        const userTasksHtml = await this.$store.getters['processStore/htmlMappingById'](
          currentData.originalStoredProcessId,
        );

        // add html info to form htmlData
        Object.keys(userTasksHtml).forEach((fileName) => {
          const htmlInfo = {
            html: userTasksHtml[fileName],
            originalStoredProcessId: currentData.originalStoredProcessId,
            info: 'existing',
          };

          if (htmlData.has(fileName)) {
            const htmlInfos = htmlData.get(fileName);
            // if the user provided html and the existing html are the same just use the existing html
            if (htmlInfos.provided.html === htmlInfo.html) {
              delete htmlInfos.provided;
            }

            htmlInfos.existing = htmlInfo;
          } else {
            htmlData.set(fileName, { existing: htmlInfo });
          }
        });
      }

      return htmlData;
    },
    async calculateUserTaskData(currentData) {
      // early exit if there is still ambiguity on how to handle the process itself
      if (
        !currentData.htmlData ||
        (!currentData.id &&
          (currentData.possibleOverrideProcess ||
            (currentData.possibleDerivedProcesses && currentData.possibleDerivedProcesses.length)))
      ) {
        return [];
      }

      const { htmlData } = currentData;

      // get the current assignments of fileNames to userTasks
      const userTaskMapping = await getUserTaskFileNameMapping(currentData.bpmn);

      const userTasks = [];

      // if 5thIndustry is to be used don't add any user tasks
      if (!(enable5thIndustryIntegration && currentData.isUsing5i)) {
        Object.entries(userTaskMapping).forEach(([taskId, { fileName }]) => {
          let userTaskData = {
            taskFileName: fileName || generateUserTaskFileName(),
            taskId,
          };

          if (!htmlData || !htmlData.has(fileName)) {
            // add default html if there is no html data for this task
            userTaskData.html = `<html><head><style>${defaultCss}</style></head> <body>${defaultHtml}</body> </html>`;
            userTaskData.info = 'missing';
            userTaskData.additionalInfo = 'default';
          } else {
            // htmlOptions should be an array with the existing or provided html for this task or both
            const htmlOptions = { ...htmlData.get(fileName) };

            // check if a one of the options might have already been selected by the user (this will be used inside the formWarning component)
            if (htmlOptions.provided && htmlOptions.provided.chosen) {
              delete htmlOptions.existing;
            }
            if (htmlOptions.existing && htmlOptions.existing.chosen) {
              delete htmlOptions.provided;
            }

            if (htmlOptions.provided && htmlOptions.existing) {
              // if there are two options for the current task and none is selected flag it as a conflict
              userTaskData.info = 'conflict';
              userTaskData.options = htmlOptions;
            } else {
              // if there is only one option use it
              const htmlInfo = htmlOptions.provided ? htmlOptions.provided : htmlOptions.existing;

              userTaskData.html = htmlInfo.html;

              if (currentData.id && currentData.id === htmlInfo.originalStoredProcessId) {
                // this user task info does already exist on the target process => we don't need to add it
                userTaskData.info = 'existing';
              } else {
                // this user task info doesn't currently exist for the target process => we need to add it
                userTaskData.info = 'missing';
                userTaskData.originalStoredProcessId = htmlInfo.originalStoredProcessId;
              }
            }
          }

          userTasks.push(userTaskData);
        });
      }

      return userTasks;
    },
    /**
     * React to changes in a processesData entry
     */
    async watchOtherChanges(currentData, currentChanges) {
      let newChanges = {};

      const mergedData = { ...currentData, ...currentChanges };

      // we only need htmlData and userTasks data if there is a process bpmn with user tasks using it
      if (mergedData.bpmn) {
        // the htmlData has to change if:
        if (
          currentChanges.bpmn || // the bpmn that defines html usage changed
          currentChanges.hasOwnProperty('id') || // we might have changed if we overwrite an existing process or not
          currentChanges.hasOwnProperty('originalStoredProcessId') // the process this one is based on changed
        ) {
          newChanges.htmlData = await this.calculateHtmlData(mergedData);
        }

        // the userTasks data has to change if:
        if (
          currentChanges.htmlData || // we have new html Data
          (currentData.htmlData && // there is existing html Data and:
            (currentChanges.hasOwnProperty('id') || // we might have changed if we overwrite an existing process or not
              currentChanges.hasOwnProperty('originalStoredProcessId') || // the process this one is based on changed
              currentChanges.hasOwnProperty('isUsing5i'))) // if 5thIndustry is to be used has changed
        ) {
          newChanges.userTasks = await this.calculateUserTaskData(mergedData);
        }
      }

      return newChanges;
    },
    // this will be called for an entry when the bpmn inside it is removed
    async removeBPMNRelatedData() {
      return { userTasks: undefined, htmlData: undefined };
    },
    /**
     * This function will be called before the process is added to the application
     *
     * It will ensure that the userTask data is set corretly on the bpmn
     */
    async beforeSubmit(processData) {
      // user task data is only needed when there is a bpmn file
      if (!processData.bpmn || !processData.userTasks) {
        return;
      }

      const conflictTask = processData.userTasks.find((userTask) => userTask.info === 'conflict');
      // at this point there should only be valid entries inside the userTasks array
      if (conflictTask) {
        throw new Error(
          `There is no valid user task data for user task with id ${conflictTask.taskId}`,
        );
      }

      const bpmnObj = await toBpmnObject(processData.bpmn);

      const constraintMapping = await getTaskConstraintMapping(bpmnObj);

      await asyncForEach(processData.userTasks, async (userTaskData) => {
        // obsolete processes are not part of the new bpmn => do nothing
        if (userTaskData.info === 'obsolete') {
          return;
        }

        const userTask = getElementById(bpmnObj, userTaskData.taskId);

        // make sure the user tasks use the correct fileName and implementation
        setUserTaskData(userTask, userTaskData.taskId, userTaskData.taskFileName);

        // make sure to add html specific constraints
        const newConstraints = getUpdatedTaskConstraintMapping(
          constraintMapping[userTask.id],
          userTaskData.html,
        );

        await addConstraintsToElementById(userTask, userTask.id, newConstraints);
      });

      processData.bpmn = await toBpmnXml(bpmnObj);
    },
    /**
     * This function will add missing user tasks to the application or remove obsolete ones
     */
    async afterSubmit(processData, finalProcess) {
      if (!processData.userTasks) {
        return;
      }

      await asyncForEach(processData.userTasks, async (userTask) => {
        if (userTask.info === 'missing') {
          await this.$store.dispatch('processStore/saveUserTask', {
            processDefinitionsId: finalProcess.id,
            taskFileName: userTask.taskFileName,
            html: userTask.html,
          });
        } else if (userTask.info === 'obsolete') {
          await this.$store.dispatch('processStore/deleteUserTask', {
            processDefinitionsId: finalProcess.id,
            taskFileName: userTask.taskFileName,
          });
        }
      });

      if (processData.imageData) {
        await asyncForEach(
          Object.entries(processData.imageData),
          async ([imageFileName, image]) => {
            await this.$store.dispatch('processStore/saveImage', {
              processDefinitionsId: processData.id,
              imageFileName,
              image,
            });
          },
        );
      }
    },
  },
};
</script>

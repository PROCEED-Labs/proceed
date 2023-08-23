<template>
  <div
    v-if="show"
    class="ide-container"
    :style="{ top: `${this.canvas.top}px`, width: '100%', height: `${this.canvas.height}px` }"
  >
    <FormBuilder
      :content="taskHtml"
      :filename="userTaskFileName"
      :milestonesHtml="milestonesHtml"
      @saveHTML="saveHTML"
      @close="close"
    />
  </div>
</template>
<script>
import FormBuilder from '@/frontend/components/form-builder/FormBuilder.vue';

import { defaultHtml, defaultCss } from '@/frontend/assets/user-task.js';
import { getUpdatedTaskConstraintMapping } from '@/frontend/helpers/usertask-helper.js';

import { eventHandler, processInterface } from '@/frontend/backend-api/index.js';

export default {
  components: {
    FormBuilder,
  },
  props: {
    canvasID: {
      type: String,
      required: true,
    },
    process: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      userTaskFileName: '',
      taskHtmlMapping: {},
      htmlChangedCallback: null,
      milestones: [],
    };
  },
  computed: {
    canvas() {
      return document.getElementById(this.canvasID).getBoundingClientRect();
    },
    show() {
      return this.$store.getters['processEditorStore/currentView'] === 'html-editor';
    },
    modeler() {
      return this.$store.getters['processEditorStore/modeler'];
    },
    selectedElement() {
      return this.$store.getters['processEditorStore/selectedElement'];
    },
    customModeling() {
      if (this.modeler) {
        return this.modeler.get('customModeling');
      }

      return undefined;
    },
    taskHtml() {
      if (this.userTaskFileName) {
        const html = this.taskHtmlMapping[this.userTaskFileName];
        return this.removeTemplateNotation(html);
      }

      return undefined;
    },
    milestonesHtml() {
      return this.createMilestonesHtml(this.milestones);
    },
  },
  methods: {
    close() {
      this.$store.commit('processEditorStore/setCurrentView', 'modeler');
    },
    /** */
    async saveHTML(htmlObject, taskId = this.selectedElement.id, fileName = this.userTaskFileName) {
      const html = await this.addTemplateNotation(
        `<html><head><style>${htmlObject.css}</style></head> <body>${htmlObject.html}</body> </html>`,
      );

      if (!fileName) {
        throw new Error('No user task fileName to store html with!');
      }

      this.$store.dispatch('processStore/saveUserTask', {
        processDefinitionsId: this.process.id,
        html: html,
        taskFileName: fileName,
      });

      this.taskHtmlMapping = { ...this.taskHtmlMapping, [this.userTaskFileName]: html };
      const proceedConstraints = this.modeler.get('proceedConstraints');

      this.customModeling.addConstraintsToElement(
        this.modeler.get('elementRegistry').get(taskId),
        getUpdatedTaskConstraintMapping(proceedConstraints.getElementConstraints(taskId), html),
      );
    },
    createMilestonesHtml(milestones) {
      const allMilestonesHTML = milestones.reduce((acc, milestone) => {
        const milestoneHTML = `
        <div>
          <label>
            Milestone ID: ${milestone.id} | Name: ${milestone.name} | Description: ${milestone.description}
            <input type="range" min="0" max="100" value="0" class="milestone-${milestone.id}" oninput="this.nextElementSibling.value = this.value + '%'">
            <output name="fulfillment_${milestone.id}">0%</output>
          </label>
        </div>`;
        return acc.concat(milestoneHTML);
      }, '');

      return `<p>Update your Milestones:</p> ${allMilestonesHTML}`;
    },
    milestonesChanged({ milestones: newMilestones, fileName }) {
      const taskHtml = this.taskHtmlMapping[fileName];
      if (taskHtml) {
        const document = new DOMParser().parseFromString(taskHtml, 'text/html');
        const milestonesWrapper = document.querySelectorAll('.milestones-wrapper');

        if (newMilestones.length > 0 && milestonesWrapper.length > 0) {
          milestonesWrapper.forEach(
            (wrapper) => (wrapper.innerHTML = `${this.createMilestonesHtml(newMilestones)}`),
          );
        } else if (newMilestones.length > 0 && milestonesWrapper.length === 0) {
          const submitButton = document.querySelector('form.form [type=submit]');
          submitButton.insertAdjacentHTML(
            'beforebegin',
            `<div class="if91m milestones-wrapper">${this.milestonesHtml}</div>`,
          );
        } else {
          milestonesWrapper.forEach((wrapper) => wrapper.remove());
        }

        const usertask = {};
        usertask.html = document.body.innerHTML;
        usertask.css = document.querySelector('style').innerText;
        this.saveHTML(usertask, this.selectedElement.id);
      }
    },
    async addTemplateNotation(html) {
      const parser = new DOMParser();
      const serializer = new XMLSerializer();

      const userTaskDocument = parser.parseFromString(html, 'text/html');

      const milestoneInputs = userTaskDocument.querySelectorAll('input[class^="milestone-"]');
      Array.from(milestoneInputs).forEach((milestoneInput) => {
        const milestoneName = Array.from(milestoneInput.classList)
          .find((className) => className.includes('milestone-'))
          .split('milestone-')
          .slice(1)
          .join('');

        const label = `{if ${milestoneName}}{${milestoneName}}%{else}0%{/if}`;
        milestoneInput.setAttribute('value', `{if ${milestoneName}}{${milestoneName}}{else}0{/if}`);
        milestoneInput.nextElementSibling.innerHTML = label;
      });

      const variableInputs = userTaskDocument.querySelectorAll('input[class^="variable-"]');
      Array.from(variableInputs).forEach((variableInput) => {
        const variableName = Array.from(variableInput.classList)
          .find((className) => className.includes('variable-'))
          .split('variable-')
          .slice(1)
          .join('');

        variableInput.setAttribute('value', `{if ${variableName}}{${variableName}}{/if}`);
      });

      const head = userTaskDocument.getElementsByTagName('head')[0];
      const script = userTaskDocument.createElement('script');
      script.innerHTML = '{script}';
      head.appendChild(script);

      return serializer.serializeToString(userTaskDocument);
    },
    removeTemplateNotation(html) {
      const parser = new DOMParser();
      const serializer = new XMLSerializer();

      const userTaskDocument = parser.parseFromString(html, 'text/html');

      const milestoneInputs = userTaskDocument.querySelectorAll('input[class^="milestone-"]');
      Array.from(milestoneInputs).forEach((milestoneInput) => {
        milestoneInput.setAttribute('value', '0');
        milestoneInput.nextElementSibling.innerHTML = '0%';
      });

      const variableInputs = userTaskDocument.querySelectorAll('input[class^="variable-"]');
      Array.from(variableInputs).forEach((variableInput) => {
        variableInput.setAttribute('value', '');
      });

      return serializer.serializeToString(userTaskDocument);
    },
  },
  watch: {
    show(isShown) {
      if (isShown) {
        // signal that this task is being edited
        this.$store.dispatch('processStore/startEditingTask', {
          taskId: this.selectedElement.id,
          processDefinitionsId: this.process.id,
        });
      } else {
        // signal that the user has stopped editing the task
        this.$store.dispatch('processStore/stopEditingTask', {
          taskId: this.selectedElement.id,
          processDefinitionsId: this.process.id,
        });
      }
    },
    modeler(newModeler) {
      if (newModeler) {
        const eventBus = newModeler.get('eventBus');
        const proceedUserTask = newModeler.get('proceedUserTask');

        eventBus.on('proceedUserTask.remove.userTask', ({ fileName }) => {
          this.$store.dispatch('processStore/deleteUserTask', {
            processDefinitionsId: this.process.id,
            taskFileName: fileName,
          });
        });

        this.userTaskFileName = proceedUserTask.getSelectedTaskFileName();
        eventBus.on('proceedUserTask.selected.changed.fileName', ({ newFileName }) => {
          this.userTaskFileName = newFileName;
        });

        this.milestones = proceedUserTask.getSelectedTaskMilestones();
        eventBus.on('proceedUserTask.selected.changed.milestones', ({ newMilestones }) => {
          this.milestones = newMilestones;
        });
        eventBus.on('proceedUserTask.changes.milestones', this.milestonesChanged);

        eventBus.on('proceedUserTask.added.fileName', ({ elementId, fileName }) => {
          this.userTaskFileName = fileName;
          const code = {};
          code.html = defaultHtml;
          code.css = defaultCss;
          this.saveHTML(code, elementId, fileName);
        });
      }
    },
    process: {
      async handler(newProcess, oldProcess) {
        if (!newProcess) {
          this.taskHtmlMapping = {};
          return;
        }

        if (newProcess !== oldProcess) {
          this.taskHtmlMapping = await processInterface.getUserTasksHTML(this.process.id);
        }
      },
      immediate: true,
    },
  },
  mounted() {
    this.htmlChangedCallback = eventHandler.on(
      'processTaskHtmlChanged',
      ({ processDefinitionsId, taskId, newHtml }) => {
        if (processDefinitionsId === this.process.id) {
          // if newHtml is null the task was deleted
          this.taskHtmlMapping = { ...this.taskHtmlMapping, [taskId]: newHtml };
        }
      },
    );
  },
  beforeDestroy() {
    if (this.htmlChangedCallback) {
      eventHandler.off('processTaskHtmlChanged', this.htmlChangedCallback);
      this.htmlChangedCallback = null;
    }
  },
};
</script>
<style scoped>
.ide-container {
  position: absolute;
  border: 1px solid lightgray;
  z-index: 999;
}
</style>

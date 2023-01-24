<template>
  <div>
    <tooltip-button
      v-if="process.type === 'process' && !process.version && !process.subprocessId"
      :loading="isCreatingVersion"
      @click="createVersion"
    >
      <template #tooltip-text>Create New Version</template>
      mdi-database-plus-outline
    </tooltip-button>
    <tooltip-button
      v-else-if="
        (process.type === 'process' || process.type === 'process-instance') &&
        process.version &&
        !process.subprocessId
      "
      @click="showVersionSelectionDialog = true"
    >
      <template #tooltip-text
        >Set as <span style="font-style: italic">Latest Version</span></template
      >
      mdi-database-arrow-left-outline
    </tooltip-button>
    <version-creation-modal
      :xml="currentProcessXml"
      :show="showVersionCreationModal"
      @close="stopVersionCreation"
      @done="onNewVersion"
    ></version-creation-modal>
    <confirmation
      title="continue editing with this version?"
      continueButtonText="Ok"
      continueButtonColor="error"
      :show="showVersionSelectionDialog"
      maxWidth="500px"
      @cancel="showVersionSelectionDialog = false"
      @continue="selectAsLatestVersion"
    >
      <div>Any changes that are not stored in another version are irrecoverably lost!</div>
    </confirmation>
  </div>
</template>
<script>
import TooltipButton from '@/frontend/components/universal/TooltipButton.vue';
import VersionCreationModal from '@/frontend/components/universal/ProcessVersioning/ProcessVersionModal.vue';
import Confirmation from '@/frontend/components/universal/Confirmation.vue';

import { getUserTaskFileNameMapping } from '@proceed/bpmn-helper';

import { convertToEditableBpmn } from '@/shared-frontend-backend/helpers/processVersioning.js';
import { asyncForEach } from '@/shared-frontend-backend/helpers/javascriptHelpers.js';

export default {
  components: { TooltipButton, VersionCreationModal, Confirmation },
  props: {
    process: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      isCreatingVersion: false,
      showVersionCreationModal: false,

      showVersionSelectionDialog: false,
    };
  },
  computed: {
    modeler() {
      return this.$store.getters['processEditorStore/modeler'];
    },
    currentProcessXml() {
      return this.$store.getters['processEditorStore/processXml'];
    },
  },
  methods: {
    stopVersionCreation() {
      this.showVersionCreationModal = false;
      this.isCreatingVersion = false;
    },
    createVersion() {
      this.showVersionCreationModal = true;
      this.isCreatingVersion = true;
    },
    onNewVersion(version) {
      this.modeler.get('customModeling').setBasedOnVersion(version, true);

      this.isCreatingVersion = false;
    },
    async getUsedFilesNames(bpmn) {
      const userTaskFileNameMapping = await getUserTaskFileNameMapping(bpmn);

      const fileNames = new Set();

      Object.values(userTaskFileNameMapping).forEach(({ fileName }) => fileNames.add(fileName));

      return [...fileNames];
    },
    async selectAsLatestVersion() {
      // make sure that the html is also rolled back
      const processHtmlMapping = await this.$store.getters['processStore/htmlMappingById'](
        this.process.id
      );

      const editableBpmn = await this.$store.getters['processStore/xmlById'](this.process.id);
      const fileNamesinEditableVersion = await this.getUsedFilesNames(editableBpmn);

      const { bpmn: convertedBpmn, changedFileNames } = await convertToEditableBpmn(
        this.currentProcessXml
      );

      await asyncForEach(fileNamesinEditableVersion, async (taskFileName) => {
        await this.$store.dispatch('processStore/deleteUserTask', {
          processDefinitionsId: this.process.id,
          taskFileName,
        });
      });

      await asyncForEach(Object.entries(changedFileNames), async ([oldName, newName]) => {
        await this.$store.dispatch('processStore/saveUserTask', {
          processDefinitionsId: this.process.id,
          taskFileName: newName,
          html: processHtmlMapping[oldName],
        });
      });

      await this.$store.dispatch('processStore/update', {
        id: this.process.id,
        changes: {},
        bpmn: convertedBpmn,
      });

      this.showVersionSelectionDialog = false;
    },
  },
};
</script>

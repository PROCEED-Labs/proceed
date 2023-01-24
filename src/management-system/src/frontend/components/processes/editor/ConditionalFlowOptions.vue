<template>
  <div>
    <toolbar-group v-if="canHaveCondition && $can('update', process)">
      <tooltip-button :disabled="isBeingEdited" @click="openDefaultFlowDialog()">
        <template v-if="!isBeingEdited" #tooltip-text>Make default flow</template>
        <template v-else #tooltip-text>Is being edited</template>
        mdi-exclamation
      </tooltip-button>
      <tooltip-button @click="showConditionForm = true">
        <template #tooltip-text>Edit Condition</template>
        mdi-square-edit-outline
      </tooltip-button>
    </toolbar-group>

    <confirmation
      title="make this flow the default. This will erase its condition!"
      text="Do you want to continue?"
      :show="isDefaultFlowDialogVisible"
      maxWidth="390px"
      @cancel="isDefaultFlowDialogVisible = false"
      @continue="makeFlowDefault"
    />

    <v-dialog v-model="showConditionForm" max-width="750px" scrollable>
      <v-card>
        <v-card-title>
          <span class="headline">Gateway Condition</span>
        </v-card-title>
        <v-card-text style="padding-top: 20px">
          <v-container grid-list-md>
            <v-form ref="condition-form" lazy-validation @submit.prevent>
              <div id="monaco-xor-condition" />
            </v-form>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" @click="saveCondition">Ok</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
<script>
import { getBusinessObject } from 'bpmn-js/lib/util/ModelUtil';
import * as monaco from 'monaco-editor';

import ToolbarGroup from '@/frontend/components/universal/toolbar/ToolbarGroup.vue';
import TooltipButton from '@/frontend/components/universal/TooltipButton.vue';
import Confirmation from '@/frontend/components/universal/Confirmation.vue';

export default {
  name: 'conditional-flow-options',
  components: {
    TooltipButton,
    ToolbarGroup,
    Confirmation,
  },
  props: {
    process: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      condition: null,
      editor: null,
      showConditionForm: false,
      canHaveCondition: false,

      isDefaultFlowDialogVisible: false,
    };
  },
  computed: {
    modeler() {
      return this.$store.getters['processEditorStore/modeler'];
    },
    selectedElement() {
      return this.$store.getters['processEditorStore/selectedElement'];
    },
    processDefinitionsId() {
      return this.$store.getters['processEditorStore/id'];
    },
    inEditingBy() {
      return this.process && this.process.inEditingBy;
    },
    isBeingEdited() {
      return this.inEditingBy.some(({ task: taskId }) => taskId === this.selectedElement.id);
    },
  },
  methods: {
    /** */
    makeFlowDefault() {
      if (!this.canHaveCondition) {
        return;
      }
      const modeling = this.modeler.get('modeling');
      modeling.updateProperties(this.selectedElement.source, {
        default: this.selectedElement.businessObject,
      });
      this.canHaveCondition = false;
      this.isDefaultFlowDialogVisible = false;
    },
    openDefaultFlowDialog() {
      // warn the user if he is about to implicitly delete a condition
      if (
        this.selectedElement.businessObject.conditionExpression &&
        this.selectedElement.businessObject.conditionExpression
      ) {
        this.isDefaultFlowDialogVisible = true;
      } else {
        this.makeFlowDefault();
      }
    },
    /**
     * Checks if the selected element can have a condition added to it (sequence flow after a OR/XOR split)
     */
    checkIfCanHaveCondition(element) {
      if (element.type === 'bpmn:SequenceFlow') {
        // check if the sequence flow is coming from an XOR or OR Gateway
        const { source } = element;
        if (
          (source.type === 'bpmn:ExclusiveGateway' || source.type === 'bpmn:InclusiveGateway') &&
          (!source.businessObject.default || source.businessObject.default.id !== element.id)
        ) {
          return true;
        }
      }

      return false;
    },
    saveCondition() {
      const obj = getBusinessObject(this.selectedElement);
      if (obj.$type === 'bpmn:SequenceFlow') {
        this.modeler
          .get('customModeling')
          .addJSToElement(this.selectedElement.id, this.editor.getValue());
      }

      this.showConditionForm = false;
    },
  },
  watch: {
    async showConditionForm(isShown) {
      if (isShown) {
        this.$store.dispatch('processStore/startEditingTask', {
          taskId: this.selectedElement.id,
          processDefinitionsId: this.processDefinitionsId,
        });

        if (!this.editor) {
          await this.$nextTick();

          this.editor = monaco.editor.create(document.getElementById('monaco-xor-condition'), {
            value: this.condition,
            language: 'javascript',
            theme: 'vs-light',
            automaticLayout: true,
            fontSize: 18,
            wordWrap: 'off',
            lineNumbers: 'off',
            lineNumbersMinChars: 0,
            overviewRulerLanes: 0,
            overviewRulerBorder: false,
            lineDecorationsWidth: 0,
            hideCursorInOverviewRuler: true,
            glyphMargin: false,
            folding: false,
            scrollBeyondLastColumn: 0,
            scrollbar: { horizontal: 'hidden', vertical: 'hidden' },
            find: {
              addExtraSpaceOnTop: false,
              autoFindInSelection: 'never',
              seedSearchStringFromSelection: false,
            },
            minimap: { enabled: false },
          });

          this.editor.onKeyDown((e) => {
            if (e.keyCode == monaco.KeyCode.Enter) {
              // We only prevent enter when the suggest model is not active
              if (
                this.editor.getContribution('editor.contrib.suggestController').model.state == 0
              ) {
                e.preventDefault();
              }
            }
          });
        } else if (isShown) {
          this.editor.setValue(this.condition);
        }
      } else {
        this.$store.dispatch('processStore/stopEditingTask', {
          taskId: this.selectedElement.id,
          processDefinitionsId: this.processDefinitionsId,
        });
      }
    },

    modeler: {
      handler(newModeler) {
        if (newModeler) {
          const eventBus = newModeler.get('eventBus');

          eventBus.on(
            'commandStack.element.updateProperties.postExecute',
            ({ context: { properties } }) => {
              if (properties && properties.default) {
                const targetFlow = properties.default;

                if (targetFlow.id === this.selectedElement.id) {
                  this.canHaveCondition = false;
                }
              }
            }
          );

          eventBus.on(
            'commandStack.element.updateScript.postExecute',
            ({ context: { element, script } }) => {
              if (this.selectedElement === element && element.type === 'bpmn:SequenceFlow') {
                this.condition = script;
                if (this.editor) {
                  this.editor.setValue(script || '');
                }
              }
            }
          );
        }
      },
      immediate: true,
    },

    selectedElement(newSelection) {
      if (newSelection) {
        this.canHaveCondition = this.checkIfCanHaveCondition(newSelection);

        const obj = getBusinessObject(newSelection);
        if (obj.$type === 'bpmn:SequenceFlow') {
          this.condition = obj.conditionExpression ? obj.conditionExpression.body : '';

          if (this.editor) {
            this.editor.setValue(this.condition || '');
          }
        }
      } else {
        this.canHaveCondition = false;
      }
    },
  },
};
</script>
<style scoped>
#monaco-xor-condition {
  border: 1px solid grey;
  width: 100%;
  height: 24px !important;
}
</style>

<template>
  <div>
    <tooltip-button
      v-if="timeDuration !== undefined"
      @click="isTimerEventDurationDialogVisible = true"
    >
      <template #tooltip-text>Edit Timer Event Duration</template>
      mdi-clock-outline
    </tooltip-button>
    <tooltip-button
      v-if="timeDate !== undefined && process.type === 'project'"
      color="primary"
      @click="isTimerEventDateDialogVisible = true"
    >
      <template #tooltip-text>Edit Timer Event Date and Time</template>
      mdi-calendar-today-outline
    </tooltip-button>
    <duration-form
      title="Timer Event Duration"
      :show="isTimerEventDurationDialogVisible"
      :formalExpression="timeDuration"
      @save="saveTimerEventDuration"
      @close="isTimerEventDurationDialogVisible = false"
    />
    <v-dialog v-model="isTimerEventDateDialogVisible" width="unset">
      <date-time-picker
        v-if="isTimerEventDateDialogVisible"
        @pick="saveTimerEventDate($event.pickedDate, $event.pickedTime)"
      ></date-time-picker>
    </v-dialog>
  </div>
</template>
<script>
import DurationForm from '@/frontend/components/processes/editor/DurationForm.vue';
import DateTimePicker from '@/frontend/components/universal/DateTimePicker.vue';
import TooltipButton from '@/frontend/components/universal/TooltipButton.vue';

import { getBusinessObject } from 'bpmn-js/lib/util/ModelUtil';
import { getTimeZone } from '@/shared-frontend-backend/helpers/javascriptHelpers.js';

export default {
  components: { DurationForm, DateTimePicker, TooltipButton },
  data() {
    return {
      timeDuration: undefined,
      timeDate: undefined,

      isTimerEventDurationDialogVisible: false,
      isTimerEventDateDialogVisible: false,
    };
  },
  computed: {
    modeler() {
      return this.$store.getters['processEditorStore/modeler'];
    },
    customModeling() {
      if (this.modeler) {
        return this.modeler.get('customModeling');
      }

      return undefined;
    },
    selectedElement() {
      return this.$store.getters['processEditorStore/selectedElement'];
    },
  },
  methods: {
    async saveTimerEventDuration(info) {
      this.customModeling.updateTimerDuration(this.selectedElement.id, info.formalExpression);
      // sync duration of element with timerevent
      this.customModeling.updateMetaData(this.selectedElement.id, {
        timePlannedDuration: info.formalExpression,
      });
      this.isTimerEventDurationDialogVisible = false;
    },
    async saveTimerEventDate(pickedDate, pickedTime) {
      const timeDate = `${pickedDate}T${pickedTime}${getTimeZone()}`;
      this.customModeling.updateTimerDate(this.selectedElementId, timeDate);
      // sync duration of element with TimerEventDuration
      this.customModeling.updateMetaData(this.selectedElementId, {
        timePlannedEnd: timeDate,
      });
      this.isTimerEventDateDialogVisible = false;
    },
  },
  watch: {
    modeler: {
      handler(newModeler) {
        if (newModeler) {
          const eventBus = newModeler.get('eventBus');

          // sync timerevent with duration of element
          eventBus.on('commandStack.element.updateProceedData.postExecuted', ({ context }) => {
            const {
              elementId,
              element: { businessObject },
              metaData,
              isExternalEvent,
            } = context;
            if (!isExternalEvent && metaData) {
              // trigger the update of the timer event definition
              // the timeout will ensure that the event is sent (would normally be prevented since it is part of the updateMetaData Event)
              if (businessObject.eventDefinitions && businessObject.eventDefinitions.length > 0) {
                const [eventDefinition] = businessObject.eventDefinitions;

                if (eventDefinition.$type === 'bpmn:TimerEventDefinition') {
                  setTimeout(() => {
                    if (
                      metaData.hasOwnProperty('timePlannedDuration') &&
                      this.timeDuration !== undefined &&
                      !this.timeDate
                    ) {
                      this.customModeling.updateTimerDuration(
                        elementId,
                        metaData.timePlannedDuration
                      );
                    }

                    if (metaData.hasOwnProperty('timePlannedEnd') && this.timeDate !== undefined) {
                      this.customModeling.updateTimerDate(elementId, metaData.timePlannedEnd);
                    }
                  });
                }
              }
            }
          });

          eventBus.on(
            'commandStack.element.updateEventDefinition.postExecuted',
            0,
            ({ context }) => {
              // update timeDuration when it changes on the selected element (might be an external event)
              if (context.elementId === this.selectedElement.id) {
                if (context.hasOwnProperty('newTimerDuration')) {
                  this.timeDuration = context.newTimerDuration.body || '';
                }
                if (context.hasOwnProperty('newTimerDate')) {
                  this.timeDate = context.newTimerDate.body || '';
                }
              }
            }
          );
        }
      },
      immediate: true,
    },

    selectedElement(newSelection) {
      // reset timeDuration on selection change
      this.timeDuration = undefined;
      this.timeDate = undefined;
      if (newSelection) {
        // initialize timeDuration if the selected element is a timer event
        const businessObject = getBusinessObject(newSelection);
        if (businessObject.eventDefinitions && businessObject.eventDefinitions.length > 0) {
          const [eventDefinition] = businessObject.eventDefinitions;

          if (eventDefinition.$type === 'bpmn:TimerEventDefinition') {
            this.timeDuration = '';
            this.timeDate;
            if (eventDefinition.timeDuration && eventDefinition.timeDuration.body) {
              this.timeDuration = eventDefinition.timeDuration.body;
            }
            if (eventDefinition.timeDate && eventDefinition.timeDate.body) {
              this.timeDate = eventDefinition.timeDate.body;
            }
          }
        }
      }
    },
  },
};
</script>

<template>
  <div>
    <tooltip-button
      v-if="timeDuration !== undefined && process.type !== 'project'"
      @click="isTimerEventDurationDialogVisible = true"
    >
      <template #tooltip-text>Edit Timer Event Duration</template>
      mdi-clock-outline
    </tooltip-button>

    <tooltip-button
      v-if="timeDuration !== undefined && timeDate !== undefined && process.type === 'project'"
      @click="isTimeFieldSelectionDialogVisible = true"
    >
      <template #tooltip-text>Edit Timer Event (Duration or Date and Time)</template>
      mdi-calendar-clock
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
    <v-dialog v-model="isTimeFieldSelectionDialogVisible" width="500px" scrollable>
      <v-card>
        <v-card-title>Edit Timer Event</v-card-title>
        <v-card-text class="pt-6 d-flex flex-column align-center">
          <div>
            <v-btn-toggle v-model="selectedTimeField" @change="changeTimeFieldSelection">
              <v-btn class="mx-0" value="duration"> Duration </v-btn>
              <v-btn class="mx-0" value="timeDate"> Date and Time </v-btn>
            </v-btn-toggle>

            <v-text-field
              v-if="selectedTimeField === 'duration'"
              label="Duration"
              :placeholder="timeDuration ? timeDuration : 'e.g. PT2H30M, P2M10D, P1Y2M3DT4H30M12S'"
              :value="timeDuration"
              background-color="white"
              @click="isTimerEventDurationDialogVisible = true"
              filled
              hide-details
            />
            <v-text-field
              v-else-if="selectedTimeField === 'timeDate'"
              label="Date and Time"
              :placeholder="timeDate ? timeDate : 'e.g.2015-09-26T09:54:00'"
              :value="timeDate"
              background-color="white"
              @click="isTimerEventDateDialogVisible = true"
              filled
              hide-details
            />
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" @click="isTimeFieldSelectionDialogVisible = false">Ok</v-btn>
        </v-card-actions>
      </v-card>
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
  props: ['process'],
  data() {
    return {
      selectedTimeField: null,
      timeDuration: undefined,
      timeDate: undefined,

      isTimeFieldSelectionDialogVisible: false,
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
    changeTimeFieldSelection(selection) {
      if (!selection) {
        this.customModeling.updateTimerDuration(this.selectedElement.id, null);
        this.customModeling.updateMetaData(this.selectedElement.id, {
          timePlannedDuration: null,
          timePlannedEnd: null,
        });
      }
    },
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
      this.customModeling.updateTimerDate(this.selectedElement.id, timeDate);
      // sync duration of element with TimerEventDuration
      this.customModeling.updateMetaData(this.selectedElement.id, {
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
                if (context.newTimerDuration !== null) {
                  this.timeDuration = context.newTimerDuration.body || '';
                } else {
                  this.timeDuration = '';
                }
                if (context.newTimerDate !== null) {
                  this.timeDate = context.newTimerDate.body || '';
                } else {
                  this.timeDate = '';
                }
              }
            }
          );
        }
      },
      immediate: true,
    },

    selectedElement: {
      handler(newSelection) {
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
              this.timeDate = '';
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
      immediate: true,
    },
    timeDuration: {
      handler(newDuration) {
        if (newDuration && newDuration.length > 0) {
          this.selectedTimeField = 'duration';
        }
      },
      immediate: true,
    },
    timeDate: {
      handler(newTimeDate) {
        if (newTimeDate && newTimeDate.length > 0) {
          this.selectedTimeField = 'timeDate';
        }
      },
      immediate: true,
    },
  },
};
</script>

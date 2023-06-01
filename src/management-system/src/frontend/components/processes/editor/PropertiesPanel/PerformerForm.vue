<template>
  <v-container>
    <p class="font-weight-medium">Performer</p>
    <v-row v-for="(performer, index) in performerRows" :key="index">
      <v-col cols="8">
        <v-text-field
          :key="index"
          label="Name"
          :rules="[noDuplicate(index)]"
          :value="performer.name"
          background-color="white"
          @blur="
            index !== performerRows.length - 1
              ? updatePerformer(
                  {
                    name: $event.target.value,
                    type: performer.type,
                  },
                  performer.name
                )
              : assignPerformer({ name: $event.target.value, type: performer.type })
          "
          filled
        />
      </v-col>
      <v-col cols="3">
        <v-autocomplete
          :items="performerTypes"
          :value="performer.type"
          class="mt-3"
          label="Type"
          @change="
            index !== performerRows.length - 1
              ? updatePerformer(
                  {
                    name: performer.name,
                    type: $event,
                  },
                  performer.name
                )
              : assignPerformer({ name: performer.name, type: $event })
          "
        ></v-autocomplete>
      </v-col>
      <v-col cols="1" class="d-flex justify-end" v-if="index !== performerRows.length - 1">
        <v-btn class="my-4" icon color="error" @click="deletePerformer(performer.name)" small
          ><v-icon>mdi-delete</v-icon></v-btn
        >
      </v-col>
    </v-row>
  </v-container>
</template>
<script>
import { getPerformers } from '@/frontend/helpers/bpmn-modeler-events/getters.js';
export default {
  components: {},
  props: [],
  data() {
    return {
      assignedPerformers: [],
      performerTypes: ['User', 'Group'],
      newPerformerInfo: {
        name: null,
        type: 'User',
      },
    };
  },
  computed: {
    modeler() {
      return this.$store.getters['processEditorStore/modeler'];
    },
    selectedElement() {
      return this.$store.getters['processEditorStore/selectedElement'];
    },
    performerRows() {
      return [...this.assignedPerformers, this.newPerformerInfo];
    },
  },
  methods: {
    noDuplicate(index) {
      const self = this;
      return function (name) {
        const duplicateIndex = self.performerRows.findIndex((row) => row.name === name);

        if (name && name.length > 0 && duplicateIndex !== -1 && duplicateIndex !== index) {
          return 'Name already exists';
        }

        return true;
      };
    },
    validateInput(newPerformerInfo, oldPerformerName) {
      if (!(newPerformerInfo && newPerformerInfo.name && newPerformerInfo.type)) {
        return false;
      }

      if (
        newPerformerInfo.name != oldPerformerName &&
        this.assignedPerformers.find((performer) => performer.name === newPerformerInfo.name)
      ) {
        return false;
      }

      return true;
    },
    mapExpressionDataToFormData(expressionData) {
      return expressionData.map((performer) => {
        if (performer.meta.name) {
          return { name: performer.meta.name, type: 'User' };
        }

        if (performer.meta.groupname) {
          return { name: performer.meta.groupname, type: 'Group' };
        }
      });
    },
    assignPerformer(newPerformerInfo) {
      this.newPerformerInfo.name = newPerformerInfo.name;
      this.newPerformerInfo.type = newPerformerInfo.type;

      if (this.validateInput(newPerformerInfo)) {
        this.emitPerformers([
          ...this.assignedPerformers,
          {
            name: newPerformerInfo.name,
            type: newPerformerInfo.type,
          },
        ]);

        this.newPerformerInfo.name = null;
        this.newPerformerInfo.type = 'User';
      }
    },
    updatePerformer(updatedPerformerInfo, oldPerformerName) {
      if (this.validateInput(updatedPerformerInfo, oldPerformerName)) {
        const updatedAssignedPerformers = [...this.assignedPerformers];

        const updatedPerformerIndex = updatedAssignedPerformers.findIndex(
          (performer) => performer.name === (oldPerformerName || updatedPerformerInfo.name)
        );

        updatedAssignedPerformers.splice(updatedPerformerIndex, 1, {
          name: updatedPerformerInfo.name,
          type: updatedPerformerInfo.type,
        });

        this.emitPerformers(updatedAssignedPerformers);
      }
    },
    deletePerformer(performerName) {
      const updatedAssignedPerformers = this.assignedPerformers.filter(
        (performer) => performer.name !== performerName
      );
      this.emitPerformers(updatedAssignedPerformers);
    },
    emitPerformers(performers) {
      const performersExpressionData = performers.map((performer) => {
        if (performer.type === 'User') {
          return { id: '', meta: { name: performer.name } };
        }
        if (performer.type === 'Group') {
          return { id: '', meta: { groupname: performer.name } };
        }
      });
      this.$emit('change', performersExpressionData);
    },
  },
  watch: {
    modeler: {
      handler(newModeler) {
        if (newModeler) {
          newModeler
            .get('eventBus')
            .on('commandStack.element.updatePerformers.postExecute', ({ context }) => {
              const { element, performers } = context;
              if (element.id === this.selectedElement.id && performers) {
                // update the assigned performers when they change on the selected element
                this.assignedPerformers = this.mapExpressionDataToFormData(performers);
              }
            });
        }
      },
      immediate: true,
    },
    selectedElement: {
      handler(newSelection) {
        // re-initialize the assigned performers when a new element is selected
        if (newSelection) {
          const performersExpressionData = getPerformers(newSelection);
          this.assignedPerformers = this.mapExpressionDataToFormData(performersExpressionData);
        } else {
          this.assignedPerformers = [];
        }
      },
      immediate: true,
    },
  },
};
</script>

<template>
  <div>
    <milestone-form
      :milestones="allMilestones"
      :showForm="showForm"
      @save="saveItem"
      @close="closeForm"
    ></milestone-form>
    <property-selection-field
      propertyName="Milestone"
      :items="allMilestones"
      :itemText="(item) => `${item.id} - ${item.name}`"
      :initialSelected="selectedMilestones"
      @change="changeSelection"
      @create="showForm = true"
    >
      <template #detailedView="{ item }">
        <v-list>
          <v-list-item>
            <v-list-item-content>
              <v-list-item-title>ID</v-list-item-title>
              <v-divider></v-divider>
              <span class="text-subtitle-2 font-weight-light">{{ item.id }}</span>
            </v-list-item-content>
          </v-list-item>
          <v-list-item>
            <v-list-item-content>
              <v-list-item-title>Name</v-list-item-title>
              <span class="text-subtitle-2 font-weight-light">{{ item.name }}</span>
            </v-list-item-content>
          </v-list-item>
          <v-list-item>
            <v-list-item-content>
              <v-list-item-title>Description</v-list-item-title>
              <span class="text-subtitle-2 font-weight-light">{{ item.description }}</span>
            </v-list-item-content>
          </v-list-item>
        </v-list>
      </template>
    </property-selection-field>
  </div>
</template>

<script>
import PropertySelectionField from '@/frontend/components/processes/editor/PropertiesPanel/PropertySelectionField.vue';
import MilestoneForm from '@/frontend/components/environment/forms/MilestoneForm.vue';
export default {
  components: { PropertySelectionField, MilestoneForm },
  name: 'MilestoneSelection',
  data() {
    return {
      selectedMilestones: [],
      showForm: false,
    };
  },
  computed: {
    modeler() {
      return this.$store.getters['processEditorStore/modeler'];
    },
    selectedElement() {
      return this.$store.getters['processEditorStore/selectedElement'];
    },
    allMilestones() {
      const storedMilestones = this.$store.getters['environmentConfigStore/milestones'] || [];
      return [...storedMilestones, ...this.selectedMilestones];
    },
  },
  methods: {
    saveItem(item) {
      this.closeForm();
      this.selectedMilestones.push({ ...item });
      this.applySelectedMilestones();
    },
    closeForm() {
      this.showForm = false;
    },
    changeSelection(selectedMilestones) {
      this.selectedMilestones = selectedMilestones;
      this.applySelectedMilestones();
    },
    applySelectedMilestones() {
      this.modeler
        .get('customModeling')
        .addMilestonesToElement(this.selectedElement, this.selectedMilestones);
    },
  },
  watch: {
    modeler: {
      handler(newModeler) {
        if (newModeler) {
          const proceedUserTask = newModeler.get('proceedUserTask');
          const eventBus = newModeler.get('eventBus');

          this.selectedMilestones = proceedUserTask.getSelectedTaskMilestones();
          eventBus.on('proceedUserTask.selected.changed.milestones', ({ newMilestones }) => {
            this.selectedMilestones = newMilestones;
          });
        }
      },
      immediate: true,
    },
  },
};
</script>

<template>
  <div>
    <working-place-form
      @save="saveItem"
      @close="closeForm"
      :showForm="showForm"
    ></working-place-form>
    <property-selection-field
      propertyName="Working Place"
      :items="allWorkingPlaces"
      :itemText="(item) => `${item.shortName} - ${item.longName}`"
      :initialSelected="selectedWorkingPlaces"
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
              <span class="text-subtitle-2 font-weight-light">{{ item.shortName }}</span>
            </v-list-item-content>
          </v-list-item>
          <v-list-item>
            <v-list-item-content>
              <v-list-item-title>Long Name</v-list-item-title>
              <span class="text-subtitle-2 font-weight-light">{{ item.longName }}</span>
            </v-list-item-content>
          </v-list-item>
          <v-list-item>
            <v-list-item-content>
              <v-list-item-title>Area Id</v-list-item-title>
              <span class="text-subtitle-2 font-weight-light">{{ item.areaId }}</span>
            </v-list-item-content>
          </v-list-item>
          <v-list-item>
            <v-list-item-content>
              <v-list-item-title>Equipment</v-list-item-title>
              <div
                v-for="equipmentItem in item.equipment"
                :key="equipmentItem.resourceId"
                class="text-subtitle-2 font-weight-light"
              >
                {{ getResource(equipmentItem.resourceId).shortName }} - Quantity:
                {{ equipmentItem.quantity }}
              </div>
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
import { getLocations } from '@/frontend/helpers/bpmn-modeler-events/getters.js';

import PropertySelectionField from '@/frontend/components/processes/editor/PropertiesPanel/PropertySelectionField.vue';
import WorkingPlaceForm from '@/frontend/components/environment/forms/WorkingPlaceForm.vue';
export default {
  name: 'WorkingPlaceSelection',
  components: { PropertySelectionField, WorkingPlaceForm },
  props: {
    process: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      selectedWorkingPlaces: [],
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
    company() {
      return this.$store.getters['environmentConfigStore/company'] || {};
    },
    factories() {
      return this.$store.getters['environmentConfigStore/factories'] || [];
    },
    buildings() {
      return this.$store.getters['environmentConfigStore/buildings'] || [];
    },
    allWorkingPlaces() {
      const storedWorkingPlaces = this.$store.getters['environmentConfigStore/workingPlaces'] || [];
      return [...storedWorkingPlaces, ...this.selectedWorkingPlaces];
    },
    areas() {
      return this.$store.getters['environmentConfigStore/areas'] || [];
    },
    resources() {
      return this.$store.getters['environmentConfigStore/resources'] || [];
    },
  },
  methods: {
    getResource(resourceId) {
      return this.resources.find((resource) => resource.id === resourceId);
    },
    saveItem(item) {
      this.closeForm();
      this.selectedWorkingPlaces.push({ ...item });
      this.applySelectedWorkingPlaces();
    },
    closeForm() {
      this.showForm = false;
    },
    changeSelection(selectedWorkingPlaces) {
      this.selectedWorkingPlaces = selectedWorkingPlaces;
      this.applySelectedWorkingPlaces();
    },
    applySelectedWorkingPlaces() {
      let company = [];
      let factory = [];
      let building = [];
      let area = [];
      let workingPlace = [];

      this.selectedWorkingPlaces.forEach((selectedWorkingPlace) => {
        const newWorkingPlace = {
          id: selectedWorkingPlace.id,
          shortName: selectedWorkingPlace.shortName,
          longName: selectedWorkingPlace.longName,
          description: selectedWorkingPlace.description,
        };

        const relatedArea = this.areas.find(
          (area) =>
            area.id === selectedWorkingPlace.areaId || area.id === selectedWorkingPlace.areaRef,
        );

        if (relatedArea) {
          newWorkingPlace.areaRef = relatedArea.id;

          if (!area.find((a) => a.id === relatedArea.id)) {
            area.push(relatedArea);
          }

          const relatedAreaBuilding = this.buildings.find((building) =>
            building.areaIds.includes(relatedArea.id),
          );

          if (relatedAreaBuilding) {
            relatedArea.buildingRef = relatedAreaBuilding.id;

            if (!building.find((b) => b.id === relatedAreaBuilding.id)) {
              building.push(relatedAreaBuilding);
            }
          }
        }

        const relatedBuilding = this.buildings.find((building) =>
          building.workingPlaceIds.includes(selectedWorkingPlace.id),
        );

        if (relatedBuilding) {
          newWorkingPlace.buildingRef = relatedBuilding.id;

          if (!building.find((b) => b.id === relatedBuilding.id)) {
            building.push(relatedBuilding);
          }

          const relatedFactory = this.factories.find((factory) =>
            factory.buildingIds.includes(relatedBuilding.id),
          );

          if (relatedFactory) {
            relatedBuilding.factoryRef = relatedFactory.id;

            if (!factory.find((f) => f.id === relatedFactory.id)) {
              factory.push(relatedFactory);
            }

            if (this.company.factoryIds.includes(relatedFactory.id)) {
              relatedFactory.companyRef = this.company.id;

              if (company.length === 0) {
                company.push({ ...this.company });
              }
            }
          }
        }

        workingPlace.push(newWorkingPlace);
      });

      this.modeler.get('customModeling').addLocationsToElement(this.selectedElement, {
        company,
        factory,
        building,
        area,
        workingPlace,
      });
    },
    onLocationChange({ context: { elementId, locations } }) {
      if (elementId === this.selectedElement.id && locations) {
        this.selectLocations(locations);
      }
    },
    selectLocations(locations = {}) {
      if (locations.workingPlace) {
        this.selectedWorkingPlaces = [...locations.workingPlace];
      }
    },
  },
  watch: {
    modeler: {
      handler(newModeler) {
        if (newModeler) {
          const eventBus = newModeler.get('eventBus');

          eventBus.on('commandStack.element.updateProceedData.postExecute', this.onLocationChange);
        }
      },
      immediate: true,
    },
    selectedElement: {
      handler(newSelection) {
        if (newSelection) {
          this.selectLocations(getLocations(newSelection));
        }
      },
      immediate: true,
    },
  },
  beforeDestroy() {
    if (this.modeler) {
      this.modeler
        .get('eventBus')
        .off('commandStack.element.updateProceedData.postExecute', this.onLocationChange);
    }
  },
};
</script>

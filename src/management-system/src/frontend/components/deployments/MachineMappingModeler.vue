<template>
  <v-card style="width: 100%; height: 100%">
    <popup style="left: 35%" :popupData="popupData" />
    <resizable-window
      v-if="selectedElementIds.length"
      canvasID="canvas"
      :initialMeasurements="initialMeasurements"
      @close="selectedElementIds = []"
    >
      <v-list style="height: 100%">
        <v-list-item
          v-for="id in selectedElementIds"
          :key="id"
          @click.stop="highlightElementId = id"
        >
          <v-list-item-content>
            <v-list-item-title v-text="id" />
          </v-list-item-content>
          <v-list-item-action>
            <v-combobox
              :items="machines"
              item-text="name"
              item-value="id"
              label="Machine ID"
              :return-object="false"
              :value="machineMapping[id].machineId"
              @change="changeMachine(id, $event, 'machineId')"
              clearable
            />
          </v-list-item-action>
          <v-list-item-action>
            <v-combobox
              :items="machineAddresses"
              label="Machine Address (ipAddress:port)"
              :value="machineMapping[id].machineAddress"
              @change="changeMachine(id, $event, 'machineAddress')"
              clearable
            />
          </v-list-item-action>
        </v-list-item>
      </v-list>
    </resizable-window>
    <v-dialog v-model="showDeploymentDialog" max-width="500px" persistent scrollable>
      <v-card>
        <v-card-title>
          <span class="headline mx-0">Deploy process directly?</span>
        </v-card-title>
        <v-card-text style="padding-top: 20px">
          All actions have a machine assigned to them, do you wish to proceed with deployment or
          change the machine mapping?
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="showDeploymentDialog = false">Edit Mapping</v-btn>
          <v-btn
            @click="
              $emit('deploy', machineMapping);
              showDeploymentDialog = false;
            "
          >
            Deploy
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-toolbar>
      <v-toolbar-title>Assign machines to every Task</v-toolbar-title>
      <v-spacer />
      <v-btn @click="$emit('cancel')">Cancel</v-btn>
      <v-btn v-if="allNodesHaveMachine" @click="$emit('deploy', machineMapping)">Deploy</v-btn>
      <v-btn color="primary" @click="saveMapping">Save</v-btn>
    </v-toolbar>
    <div id="canvas" style="height: calc(100% - 64px)" class="diagram-container">
      <hovering-toolbar>
        <toolbar-group>
          <div class="hovering-toolbar-palette"></div>
        </toolbar-group>
      </hovering-toolbar>
    </div>
  </v-card>
</template>
<script>
import Modeler from 'bpmn-js/lib/Modeler.js';
import CliModule from 'bpmn-js-cli/lib';
import hexToRgba from 'hex-rgba';

import ResizableWindow from '@/frontend/components/resizable-window/ResizableWindow.vue';
import CustomPaletteProvider from '@/frontend/helpers/override-modules/restricted-palette.js';
import CustomContextPad from '@/frontend/helpers/override-modules/restricted-context-pad.js';
import { getElementMachineMapping } from '@proceed/bpmn-helper';
import AlertWindow from '@/frontend/components/universal/Alert.vue';
import HoveringToolbar from '@/frontend/components/universal/toolbar/HoveringToolbar.vue';
import ToolbarGroup from '@/frontend/components/universal/toolbar/ToolbarGroup.vue';

export default {
  props: {
    xml: { type: String },
    show: { type: Boolean, default: false },
  },
  components: {
    ResizableWindow,
    popup: AlertWindow,
    HoveringToolbar,
    ToolbarGroup,
  },
  data() {
    return {
      modeler: null,
      machineMapping: {},
      selectedElementIds: [],
      highlightElementId: undefined,
      allNodesHaveMachine: false,
      popupData: {
        body: '',
        display: 'none',
        color: 'error',
      },
      showDeploymentDialog: false,
    };
  },
  computed: {
    canvas() {
      let canvas = document.getElementById('canvas');
      canvas = canvas.getBoundingClientRect();
      return canvas;
    },
    initialMeasurements() {
      return {
        top: `64px`,
        right: `0px`,
        width: `${this.canvas.width / 2}px`,
        height: `${this.canvas.height}px`,
      };
    },
    selectedMapping() {
      return this.selectedElementIds.map((id) => ({ id, machineInfo: this.machineMapping[id] }));
    },
    machines() {
      return this.$store.getters['machineStore/machines'];
    },
    machineIds() {
      return this.machines.map((machine) => machine.id);
    },
    machineAddresses() {
      return this.machines.map((machine) => machine.ip.concat(':', machine.port));
    },
  },
  methods: {
    async changeMachine(elementId, newMachineValue, property) {
      this.machineMapping[elementId][property] = newMachineValue;
      this.colorMapping();
    },
    colorMapping() {
      const cli = this.modeler.get('cli');
      Object.keys(this.machineMapping).forEach((eid) => {
        let fill;
        if (this.machineMapping[eid].machineId) {
          fill = hexToRgba(
            this.$store.getters['machineStore/color'](this.machineMapping[eid].machineId),
            50
          );
        } else if (this.machineMapping[eid].machineAddress) {
          const ip = this.machineMapping[eid].machineAddress.split(':')[0];
          const machine = this.$store.getters['machineStore/machineByHost'](ip);
          if (machine) {
            fill = hexToRgba(this.$store.getters['machineStore/color'](machine.id), 50);
          }
        } else {
          fill = 'white';
        }
        this.modeler.get('modeling').setColor(cli.element(eid), { fill, stroke: 'black' });
      });
    },
    everyNodeHasAMachine() {
      for (const { machineAddress, machineId } of Object.values(this.machineMapping)) {
        if (!machineAddress && !machineId) {
          return false;
        }
      }

      return true;
    },
    saveMapping() {
      this.allNodesHaveMachine = this.everyNodeHasAMachine();
      if (this.allNodesHaveMachine) {
        this.$emit('saveMachineMapping', this.machineMapping);
      } else {
        this.popupData.body = 'Not all flow nodes have a machine address/id assigned!';
        this.popupData.display = 'block';
      }
    },
  },
  mounted() {
    const overrideModules = {
      __init__: ['paletteProvider', 'contextPadProvider'],
      paletteProvider: ['type', CustomPaletteProvider],
      contextPadProvider: ['type', CustomContextPad],
    };

    this.modeler = new Modeler({
      container: '#canvas',
      keyboard: { bindTo: document },
      additionalModules: [overrideModules, CliModule],
    });

    const eventBus = this.modeler.get('eventBus');

    const getSelectedNodeIds = (selectedArray) => {
      return selectedArray
        .filter(
          (element) =>
            element.id.includes('Activity') ||
            element.id.includes('Event') ||
            element.id.includes('Gateway') ||
            Object.getPrototypeOf(element).constructor.name === 'Shape' ||
            Object.getPrototypeOf(element).constructor.name === 'xt'
        )
        .map((element) => element.id);
    };

    eventBus.on('element.click', () => {
      this.selectedElementIds = getSelectedNodeIds(this.modeler.get('selection').get());
    });

    eventBus.on('lasso.end', () => {
      this.selectedElementIds = getSelectedNodeIds(this.modeler.get('selection').get());
    });
  },
  watch: {
    async show() {
      if (this.show) {
        let exception = false;
        try {
          const result = await this.modeler.importXML(this.xml);
        } catch (err) {
          this.popupData.body = '--> Error importing BPMN XML';
          this.popupData.display = 'block';
          this.$logger.error(err.message, err.warnings);
          exception = true;
        }
        if (!exception) {
          this.machineMapping = await getElementMachineMapping(this.xml);
          this.allNodesHaveMachine = this.everyNodeHasAMachine();
          if (this.allNodesHaveMachine && !this.showDeploymentDialog) {
            this.showDeploymentDialog = true;
          }
          this.colorMapping();
        }
      }
    },
    highlightElementId() {
      this.colorMapping();
      const cli = this.modeler.get('cli');
      this.modeler
        .get('modeling')
        .setColor(cli.element(this.highlightElementId), { stroke: 'red' });
    },
  },
};
</script>
<style lang="scss">
.hovering-toolbar-palette .djs-palette {
  position: static !important;
  width: 60px !important;
}
</style>

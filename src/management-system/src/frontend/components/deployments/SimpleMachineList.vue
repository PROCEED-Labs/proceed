<template>
  <div>
    <div v-if="!chips">
      <v-icon left>mdi-cellphone-link</v-icon>
      <strong>{{ label }}: </strong>
      <ul v-if="filteredMachines.length > 1">
        <li v-for="machine in filteredMachines" :key="machine.id">
          <PropertiesTooltip :object="machine" activatorProperty="name" />
        </li>
      </ul>
      <span v-else-if="filteredMachines.length === 1">
        <PropertiesTooltip :object="filteredMachines[0]" activatorProperty="name" />
      </span>
      <span v-else class="font-italic">No machines found</span>
    </div>
    <div v-else>
      <v-chip-group column>
        <v-chip
          v-for="(machine, index) in filteredMachines"
          :key="index"
          :color="getMachineColor(machine.id)"
          dark
          small
          @click="$emit('click-machine', machine)"
          ><PropertiesTooltip :object="machine" activatorProperty="name" remove-styling
        /></v-chip>
      </v-chip-group>
    </div>
  </div>
</template>

<script>
import PropertiesTooltip from '@/frontend/components/universal/PropertiesTooltip.vue';

export default {
  name: 'SimpleMachineList',
  components: {
    PropertiesTooltip,
  },
  props: {
    machines: {
      type: Array,
      required: false,
      default: () => [],
      validator: (machines) => Array.isArray(machines),
    },
    chips: {
      type: Boolean,
      required: false,
      default: false,
    },
  },
  computed: {
    knownMachines() {
      return this.$store.getters['machineStore/machines'];
    },
    filteredMachines() {
      return this.machines.reduce((curr, machineId) => {
        const knownMachine = this.knownMachines.find((m) => m.id === machineId);
        if (knownMachine) curr.push(knownMachine);
        return curr;
      }, []);
    },
    label() {
      return this.filteredMachines.length === 1 ? 'Machine' : 'Machines';
    },
  },
  methods: {
    getMachineColor(machineId) {
      return this.$store.getters['machineStore/color'](machineId);
    },
    getMachineById(machineId) {
      return this.$store.getters['machineStore/machineById'](machineId);
    },
  },
};
</script>

<template>
  <v-dialog :value="show" max-width="600px" @input="cancel" scrollable>
    <v-card>
      <v-card-title>
        <span class="headline mx-0" v-if="!isEditing">Add Machine</span>
        <span class="headline mx-0" v-if="isEditing">Edit Machine</span>
      </v-card-title>
      <v-card-text>
        <!--div v-if="!hostname && !ip" class="text-left">
        You need to either specify an IP Address or a Hostname
      </div-->
        <v-form ref="machine-form" lazy-validation @submit.prevent>
          <!--v-text-field v-model="hostname" v-if="!ip || isEditing" label="Hostname" /-->
          <v-text-field
            v-model="ip"
            v-if="!hostname || isEditing"
            label="Address"
            @blur="augmentURL"
          />
          <!--v-text-field v-model="port" v-if="!hostname || isEditing" label="Port (Optional)" /-->
          <v-text-field v-model="optionalName" label="Own Name (Optional)" />
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn small @click="cancel">Cancel</v-btn>
        <v-btn
          color="primary"
          small
          :disabled="!hostname && !ip && !$can('manage', 'Machine')"
          v-if="!isEditing"
          @click="add"
        >
          Add
        </v-btn>
        <v-btn
          color="primary"
          small
          :disabled="!hostname && !ip && !$can('manage', 'Machine')"
          v-if="isEditing"
          @click="update"
        >
          Update
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  name: 'MachineForm',
  props: {
    machine: {
      type: Object,
    },
    show: {
      type: Boolean,
      required: true,
    },
  },
  data() {
    return {
      missingInput: false,
      optionalName: '',
      hostname: '',
      port: '',
      ip: '',
    };
  },
  computed: {
    isEditing() {
      return !!this.machine;
    },
  },
  methods: {
    add() {
      if (this.hostname || this.ip) {
        let { port } = this;
        if (this.port === '') {
          port = 33029;
        }
        this.$emit('add', {
          hostname: this.hostname.trim(),
          ip: this.ip.trim(),
          optionalName: this.optionalName,
          status: 'DISCONNECTED',
        });
        this.reset();
      } else {
        this.missingInput = true;
      }
    },
    update() {
      if (this.hostname || this.ip) {
        let { port } = this;
        if (this.port === '') {
          port = 33029;
        }
        this.$emit('update', {
          ...this.machine,
          id: this.machine.id,
          optionalName: this.optionalName,
          hostname: this.hostname,
          ip: this.ip,
          port,
        });
      } else {
        this.missingInput = true;
      }
    },
    augmentURL() {
      if (this.show && !this.ip.startsWith('http')) {
        this.ip = `http://${this.ip}`;
      }

      // let url = urlParse(this.ip, {});

      // this.ip = url.origin;
    },
    reset() {
      this.optionalName = '';
      this.hostname = '';
      this.port = '';
      this.ip = '';
    },
    cancel() {
      this.$emit('cancel');
      this.reset();
    },
  },
  watch: {
    machine(newMachine) {
      this.reset();
      if (newMachine) {
        this.optionalName = this.machine.optionalName;
        this.hostname = this.machine.hostname.trim();
        this.port = this.machine.port;
        this.ip = this.machine.ip.trim();
      }
    },
  },
};
</script>

<template>
  <div>
    <v-dialog :value="show" max-width="750px" @input="cancel" scrollable>
      <v-card>
        <v-card-title>
          <span class="headline" v-if="isEditing">Edit Variable</span>
          <span class="headline" v-else>Add Variable</span>
        </v-card-title>
        <v-card-text>
          <v-form ref="variable-form" lazy-validation @submit.prevent>
            <v-row>
              <v-col cols="12" sm="12" md="12">
                <v-text-field v-model="name" label="Name" required />
              </v-col>
              <v-col cols="12" sm="12" md="12">
                <v-select v-model="type" :items="types" label="Type" required />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="cancel">Cancel</v-btn>
          <v-btn color="error" v-if="deleteOption" @click="showDeleteDialog = true">Delete</v-btn>
          <v-btn color="primary" v-if="isEditing" @click="update">Update</v-btn>
          <v-btn :disabled="!type || !name" color="primary" v-else @click="add">Add</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <confirmation
      title="delete this variable?"
      text="Changes can not be undone!"
      continueButtonText="Delete"
      continueButtonColor="error"
      :show="showDeleteDialog"
      maxWidth="500px"
      @cancel="showDeleteDialog = false"
      @continue="
        showDeleteDialog = false;
        $emit('delete');
      "
    />
  </div>
</template>

<script>
import confirmation from '@/frontend/components/universal/Confirmation.vue';

export default {
  name: 'VariableForm',
  components: { confirmation },
  props: ['variable', 'deleteOption', 'show'],
  data() {
    return {
      name: null,
      type: null,
      types: ['number', 'string', 'boolean', 'array', 'object', 'null'],
      showDeleteDialog: false,
    };
  },
  computed: {
    isEditing() {
      return !!this.variable;
    },
  },
  methods: {
    add() {
      this.$emit('add', { name: this.name, type: this.type });
      this.reset();
    },
    update() {
      this.$emit('update', { name: this.name, type: this.type });
      this.reset();
    },
    reset() {
      this.name = null;
      this.type = null;
    },
    cancel() {
      this.$emit('cancel');
      this.reset();
    },
  },
  watch: {
    variable: {
      handler(newVariable) {
        this.name = newVariable ? newVariable.name : null;
        this.type = newVariable ? newVariable.type : null;
      },
      immediate: true,
    },
  },
};
</script>

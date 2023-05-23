<template>
  <v-dialog :value="showForm" @input="closeForm" max-width="800px">
    <v-card>
      <v-card-title>
        <span class="text-h5">{{ formTitle }}</span>
      </v-card-title>

      <v-card-text>
        <v-container>
          <v-row>
            <v-col cols="6">
              <v-text-field disabled v-model="editedItem.id" label="ID"></v-text-field>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="4">
              <v-text-field
                :disabled="formMode === 'View'"
                v-model="editedItem.shortName"
                label="Short Name"
              ></v-text-field>
            </v-col>
            <v-col cols="6">
              <v-text-field
                :disabled="formMode === 'View'"
                v-model="editedItem.longName"
                label="Long Name"
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12">
              <v-textarea
                :disabled="formMode === 'View'"
                v-model="editedItem.description"
                rows="3"
                auto-grow
                counter
                clearable
                label="Description"
              ></v-textarea>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="6">
              <v-text-field
                :disabled="formMode === 'View'"
                v-model="editedItem.manufacturer"
                label="Manufacturer"
              ></v-text-field>
            </v-col>
            <v-col cols="4">
              <v-text-field
                :disabled="formMode === 'View'"
                v-model="editedItem.serialNumber"
                label="Serial Number"
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="6">
              <v-combobox
                :disabled="formMode === 'View'"
                v-model="editedItem.tags"
                :items="[]"
                label="Select Tags"
                multiple
                chips
              ></v-combobox>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="3">
              <v-text-field
                :disabled="formMode === 'View'"
                v-model="editedItem.storedQuantity"
                @input="
                  editedItem.availableQuantity =
                    editedItem.storedQuantity - editedItem.reservedQuantity
                "
                label="Stored Quantity"
              ></v-text-field>
            </v-col>
            <v-col cols="3">
              <v-text-field
                :disabled="formMode === 'View'"
                v-model="editedItem.reservedQuantity"
                @input="
                  editedItem.availableQuantity =
                    editedItem.storedQuantity - editedItem.reservedQuantity
                "
                label="Reserved Quantity"
              ></v-text-field>
            </v-col>
            <v-col cols="3">
              <v-text-field
                disabled
                v-model="editedItem.availableQuantity"
                label="Available Quantity"
              ></v-text-field>
            </v-col>
            <v-col cols="2">
              <v-text-field
                :disabled="formMode === 'View'"
                v-model="editedItem.unit"
                label="Unit"
              ></v-text-field>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>

      <v-card-actions class="justify-end">
        <v-btn v-if="formMode === 'View'" color="blue darken-1" text @click="closeForm">
          Close
        </v-btn>
        <div v-else>
          <v-btn color="blue darken-1" text @click="closeForm"> Cancel </v-btn>
          <v-btn color="blue darken-1" text @click="saveItem"> Save </v-btn>
        </div>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { v4 } from 'uuid';
export default {
  props: {
    formMode: {
      type: String,
      required: false,
      default: 'View', // View | Edit | Create
    },
    resourceData: {
      type: Object,
      required: false,
    },
    showForm: {
      type: Boolean,
      default: false,
    },
  },
  data: () => ({
    search: '',
    valid: false,
    editedItem: {
      id: null,
      longName: null,
      shortName: null,
      manufacturer: null,
      description: null,
      tags: [],
      unit: null,
      reservedQuantity: 0,
      storedQuantity: 0,
      availableQuantity: 0,
      serialNumber: null,
    },
    defaultItem: {
      id: null,
      longName: null,
      shortName: null,
      manufacturer: null,
      description: null,
      tags: [],
      unit: null,
      reservedQuantity: 0,
      storedQuantity: 0,
      availableQuantity: 0,
      serialNumber: null,
    },
  }),

  computed: {
    formTitle() {
      switch (this.formMode) {
        case 'View':
          return 'Resource Information';
        case 'Create':
          return 'New Resource';
        case 'Edit':
          return 'Edit Resource';
        default:
          return '';
      }
    },
  },

  methods: {
    generateID() {
      return v4();
    },
    resetForm() {
      this.editedItem = { ...this.defaultItem };
    },
    closeForm() {
      this.resetForm();
      this.$emit('close');
    },
    saveItem() {
      this.$emit('save', { ...this.editedItem });
    },
  },
  watch: {
    resourceData: {
      immediate: true,
      deep: true,
      handler(newData) {
        if (newData && Object.keys(newData).length > 0) {
          this.editedItem = { ...newData };
        } else {
          this.editedItem = { ...this.defaultItem };
          this.editedItem.id = this.generateID();
        }
      },
    },
  },
};
</script>
<style lang="scss" scoped></style>

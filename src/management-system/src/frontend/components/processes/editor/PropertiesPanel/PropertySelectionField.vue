<template>
  <div>
    <v-dialog v-model="showDetailedInformationDialog" max-width="400px">
      <v-card>
        <v-card-title>
          {{ propertyName }} Information
          <v-spacer></v-spacer>
          <v-icon @click="closePropertyInformation()">mdi-close</v-icon>
        </v-card-title>
        <v-divider></v-divider>
        <div v-if="requiredDetailedInformation">
          <slot name="detailedView" :item="requiredDetailedInformation"></slot>
        </div>
      </v-card>
    </v-dialog>
    <v-autocomplete
      :value="initialSelected"
      :items="items"
      :item-text="itemText"
      :label="label"
      :multiple="multipleSelection"
      :filter="filterItems"
      small-chips
      :deletable-chips="multipleSelection"
      return-object
      @change="emitSelectedItems"
    >
      <template v-slot:item="{ item, attrs, on }">
        <v-list-item v-on="on" v-bind="attrs" #default="{ active }">
          <v-list-item-content>
            <v-list-item-title>
              <v-checkbox
                v-if="multipleSelection"
                class="my-0"
                hide-details
                :input-value="active"
                :label="itemText(item)"
              ></v-checkbox>
              <span v-else>{{ itemText(item) }}</span>
            </v-list-item-title>
          </v-list-item-content>
          <v-list-item-action>
            <v-icon @click.stop="showDetailedInformation(item)">mdi-information-outline</v-icon>
          </v-list-item-action>
        </v-list-item>
      </template>
      <template v-slot:no-data>
        <v-list-item @click.stop="createItem()">
          <v-list-item-title>No result found. Create new {{ propertyName }}?</v-list-item-title>
          <v-list-item-action><v-icon>mdi-plus</v-icon></v-list-item-action>
        </v-list-item>
      </template>
    </v-autocomplete>
  </div>
</template>

<script>
export default {
  name: 'PropertySelectionField',
  props: {
    multipleSelection: {
      type: Boolean,
      default: true,
    },
    initialSelected: {
      type: [Array, Object],
    },
    propertyName: {
      type: String,
    },
    items: {
      type: Array,
    },
    itemText: {
      type: Function,
    },
  },
  data() {
    return {
      showDetailedInformationDialog: false,
      requiredDetailedInformation: null,
    };
  },
  computed: {
    label() {
      return this.multipleSelection
        ? `Select ${this.propertyName}s`
        : `Select ${this.propertyName}`;
    },
  },
  methods: {
    filterItems(item, queryText) {
      if (typeof item === 'string') {
        return item.toLocaleLowerCase().indexOf(queryText.toLocaleLowerCase()) > -1;
      }

      if (typeof item === 'number') {
        return item.toString().indexOf(queryText.toLocaleLowerCase()) > -1;
      }

      if (typeof item === 'object' && item) {
        if (!Array.isArray(item)) {
          return Object.values(item).some((i) => {
            return this.filterItems(i, queryText);
          });
        } else {
          return item.some((i) => {
            return this.filterItems(i, queryText);
          });
        }
      }

      return false;
    },
    showDetailedInformation(item) {
      this.showDetailedInformationDialog = true;
      this.requiredDetailedInformation = item;
    },
    closePropertyInformation() {
      this.showDetailedInformationDialog = false;
      this.requiredDetailedInformation = null;
    },
    createItem() {
      this.$emit('create');
    },
    emitSelectedItems(selectedItems) {
      this.$emit('change', selectedItems);
    },
  },
};
</script>

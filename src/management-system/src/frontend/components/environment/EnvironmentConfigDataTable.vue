<template>
  <v-card flat>
    <v-dialog v-model="deleteDialog" max-width="550px">
      <v-card>
        <v-card-title class="text-h5 text-center justify-center">
          {{ deleteConfirmText }}
        </v-card-title>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue darken-1" text @click="closeDeleteDialog">Cancel</v-btn>
          <v-btn color="blue darken-1" text @click="deleteItemConfirm">OK</v-btn>
          <v-spacer></v-spacer>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-card-title>
      <v-menu :disabled="!selectedItems.length" offset-y>
        <template v-slot:activator="{ on }">
          <v-btn color="primary" :disabled="!selectedItems.length" v-on="on">
            <v-icon left>mdi-menu-down</v-icon>Select Action
          </v-btn>
        </template>
        <v-list>
          <v-list-item v-if="selectedItems.length === 1" @click="editItem(selectedItems[0])">
            <v-list-item-title> <v-icon left>mdi-pencil</v-icon>Edit </v-list-item-title>
          </v-list-item>
          <v-list-item @click="deleteDialog = true">
            <v-list-item-title> <v-icon left>mdi-delete</v-icon>Delete </v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
      <v-spacer></v-spacer>
      <v-text-field
        class="ma-0 pa-0"
        v-model="search"
        append-icon="mdi-magnify"
        label="Search"
        single-line
        hide-details
      ></v-text-field>
    </v-card-title>
    <v-divider></v-divider>
    <v-data-table
      class="environment-data-table"
      :items="items"
      :headers="showHeaders"
      v-model="selectedItems"
      show-select
      :search="search"
    >
      <template v-slot:header.data-table-expand>
        <v-menu internal-activator offset-y>
          <template v-slot:activator="{ on, attrs }">
            <v-btn icon v-bind="attrs" v-on="on">
              <v-icon>mdi-dots-vertical</v-icon>
            </v-btn>
          </template>
          <v-list>
            <v-list-item
              v-for="(header, index) in headers.filter((header) => header.text)"
              :key="index"
              color="primary"
              :input-value="isHeaderDisplayed(header)"
              @click="handleHeaderSelection(header)"
            >
              <v-list-item-action>
                <v-checkbox :input-value="isHeaderDisplayed(header)" color="primary"></v-checkbox>
              </v-list-item-action>

              <v-list-item-content>
                <v-list-item-title>{{ header.text }}</v-list-item-title>
              </v-list-item-content>
            </v-list-item>
          </v-list>
        </v-menu>
      </template>
      <template v-for="header in headers" #[`item.${header.value}`]="{ item }">
        <slot :name="`item.${header.value}`" :item="item"> {{ item[header.value] }} </slot>
      </template>
      <template v-slot:item.actions="{ item }">
        <v-icon small class="mr-2" @click="editItem(item)"> mdi-pencil </v-icon>
        <v-icon small @click="deleteItem(item)"> mdi-delete </v-icon>
      </template>
    </v-data-table>
  </v-card>
</template>

<script>
export default {
  props: {
    items: {
      type: Array,
      required: true,
    },
    headers: {
      type: Array,
      required: true,
    },
  },
  data: () => ({
    search: '',
    deleteDialog: false,
    selectedItems: [],
    displayedHeaders: [],
  }),
  computed: {
    deleteConfirmText() {
      return this.selectedItems.length === 1
        ? 'Are you sure you want to delete this item?'
        : 'Are you sure you want to delete these items?';
    },
    showHeaders() {
      const showHeaders = this.headers.filter((header) =>
        this.displayedHeaders.includes(header.value)
      );
      return [
        ...showHeaders,
        { text: 'Edit/Delete', value: 'actions', display: true, align: 'center', sortable: false },
        {
          value: 'data-table-expand',
          text: '',
          align: 'center',
          display: true,
          filterable: false,
          sortable: false,
        },
      ];
    },
  },
  methods: {
    handleHeaderSelection(header) {
      if (this.displayedHeaders.includes(header.value)) {
        this.displayedHeaders = this.displayedHeaders.filter(
          (headerValue) => headerValue !== header.value
        );
      } else {
        this.displayedHeaders = [...this.displayedHeaders, header.value];
      }
    },
    isHeaderDisplayed(header) {
      return this.displayedHeaders.includes(header.value);
    },
    editItem(item) {
      this.$emit('edit', item);
    },
    deleteItem(item) {
      this.selectedItems = this.items.filter((i) => i.id === item.id);
      this.deleteDialog = true;
    },
    deleteItemConfirm() {
      this.$emit('delete', this.selectedItems);
      this.closeDeleteDialog();
    },
    closeDeleteDialog() {
      this.deleteDialog = false;
    },
  },
  watch: {
    deleteDialog(val) {
      val || this.closeDeleteDialog();
    },
    headers: {
      immediate: true,
      handler(newHeaders) {
        this.displayedHeaders = newHeaders
          .filter((header) => !header.hide)
          .map((header) => header.value);
      },
    },
  },
};
</script>
<style lang="scss">
.environment-data-table.v-data-table tbody tr:not(.v-data-table__empty-wrapper) {
  cursor: pointer;

  &:not(.v-data-table__expanded__content):nth-of-type(odd) {
    background-color: #f5f5f5;
  }

  &:not(.v-data-table__expanded__content):hover,
  &.v-data-table__expanded.v-data-table__expanded__row {
    background-color: #1976d248;
  }

  &.v-data-table__expanded.v-data-table__expanded__content {
    cursor: default;
  }
}
</style>

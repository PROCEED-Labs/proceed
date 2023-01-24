<template>
  <div class="ide-column">
    <v-list subheader expand dense>
      <!--v-subheader>
            <v-text-field
              v-model="elementFilter"
              prepend-icon="mdi-magnify"
              placeholder="Filter processes"
            />
          </v-subheader-->
      <v-list v-for="process in menuFiltered" v-model="process.active" :key="process.id" no-action>
        <v-tooltip v-if="process.name && process.name.length > 25" nudge-top="20" bottom>
          <template v-slot:activator="{ on, attrs }">
            <v-list-item v-bind="attrs" v-on="on">
              <v-list-item-content>
                <v-list-item-title>
                  <v-icon
                    size="26px"
                    class="mr-3"
                    :color="isProcessSelected(process.elements) ? 'primary' : ''"
                    >$vuetify.icons.product</v-icon
                  ><b>{{ process.name }}</b></v-list-item-title
                >
              </v-list-item-content>
            </v-list-item>
          </template>
          <span>{{ process.name }}</span>
        </v-tooltip>

        <v-list-item v-else>
          <v-list-item-content>
            <v-list-item-title>
              <v-icon
                size="26px"
                class="mr-3"
                :color="isProcessSelected(process.elements) ? 'primary' : ''"
                >$vuetify.icons.product</v-icon
              ><b>{{ process.name }}</b></v-list-item-title
            >
          </v-list-item-content>
        </v-list-item>
        <v-list-item
          v-for="element in process.elements"
          :key="element.id"
          :value="true"
          :class="element.id === openElementId ? 'v-list__tile--active' : ''"
          @click="$emit('open', element)"
          class="ml-3"
        >
          <v-list-item-content>
            <v-list-item-title>
              <v-icon
                size="26px"
                class="mr-3"
                :color="element.id === openElementId ? 'primary' : ''"
                >$vuetify.icons.scriptTask</v-icon
              >
              {{ element.title }}
              <span v-if="element.id === selectedElement.id">(active)</span>
            </v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-divider />
      </v-list>
    </v-list>
  </div>
</template>
<script>
/**
 * Scripting IDE component.
 */
export default {
  props: {
    menuFiltered: Array,
    openElementId: String,
    selectedElement: Object,
  },

  methods: {
    isProcessSelected(processElements) {
      const el = processElements.find((el) => el.id === this.openElementId);
      return !!el;
    },
  },
};
</script>

<style>
.ide-column {
  background-color: #ffffff;
  height: 100%;
  overflow: auto;
  position: relative;
  border-right: 2px solid #f5f5f5;
}
</style>

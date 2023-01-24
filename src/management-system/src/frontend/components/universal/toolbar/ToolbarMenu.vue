<template>
  <span>
    <span v-if="!hideSelectedText">
      <span style="margin-left: 16px" v-if="selectedItem">{{
        itemTextattribute ? selectedItem[itemTextattribute] : selectedItem
      }}</span>
      <span
        style="margin-left: 16px; color: darkgray; font-style: italic"
        v-else-if="noSelectionText"
        >{{ noSelectionText }}</span
      >
    </span>

    <v-menu absolute offset-y>
      <template #activator="{ on, attrs }">
        <tooltip-button v-on="on" v-bind="attrs">
          <template #tooltip-text>
            <slot name="open-hint">Open Menu</slot>
          </template>
          <slot name="open-icon">mdi-chevron-down</slot>
        </tooltip-button>
      </template>
      <v-list>
        <slot name="list-prepend"></slot>
        <!-- TODO: Highlighting is wrong when the list size changes -->
        <v-list-item-group :mandatory="mandatorySelection" :value="selectedIndex" color="primary">
          <v-tooltip
            v-for="(item, index) in items"
            :key="index"
            :disabled="!itemHintAttribute"
            right
          >
            <template #activator="{ on }">
              <v-list-item @click="$emit('selectionChange', item)" v-on="on">
                {{ itemTextattribute ? item[itemTextattribute] : item }}
              </v-list-item>
            </template>
            <span>{{ item[itemHintAttribute] }}</span>
          </v-tooltip>
        </v-list-item-group>
      </v-list>
    </v-menu>
  </span>
</template>
<script>
import TooltipButton from '@/frontend/components/universal/TooltipButton.vue';

export default {
  components: { TooltipButton },
  model: {
    prop: 'selectedItem',
    event: 'selectionChange',
  },
  props: {
    selectedItem: {},
    items: {
      type: Array,
      required: true,
    },
    itemTextattribute: {
      type: String,
    },
    hideSelectedText: {
      type: Boolean,
      default: false,
    },
    itemHintAttribute: {
      type: String,
    },
    noSelectionText: {
      type: String,
    },
    mandatorySelection: {
      type: Boolean,
      default: () => false,
    },
  },
  computed: {
    selectedIndex() {
      return this.items.findIndex((item) => item === this.selectedItem);
    },
  },
};
</script>

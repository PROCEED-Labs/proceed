<template>
  <div>
    <v-treeview
      :items="treeData"
      item-children="subprocesses"
      item.key="elementId"
      hoverable
      open-all
      return-object
      :activatable="isDynamicSelection"
      :active.sync="active"
    >
      <template v-slot:append="{ item }">
        <v-icon v-if="item.isCallActivity"> mdi-earth </v-icon>
      </template>
      <template v-slot:label="{ item }">
        <div
          :style="{
            cursor: item.elementId ? 'pointer' : 'default',
          }"
          :disabled="!item.elementId"
          @click="$emit('click', item)"
        >
          <span> {{ item.name || item.elementId }}</span>
        </div>
      </template>
    </v-treeview>
  </div>
</template>

<script>
export default {
  name: 'SubprocessesTreeview',
  props: {
    process: {
      type: Object,
      required: true,
    },
    subprocesses: {
      type: Array,
      required: true,
    },
    selectedSubprocessId: {
      type: String,
      required: false,
    },
    isDynamicSelection: {
      type: Boolean,
      required: true,
    },
  },
  data() {
    return {
      active: [
        {
          id: this.selectedSubprocessId ? this.selectedSubprocessId : this.process.id,
        },
      ],
    };
  },
  watch: {
    active() {
      if (this.isDynamicSelection && this.active.length === 0) {
        this.active.push(this.treeData[0]);
      }
      this.$emit('active', this.active[0]);
    },
  },
  computed: {
    treeData() {
      const treeData = [];
      if (Array.isArray(this.subprocesses) && this.subprocesses.length) {
        treeData.push({
          ...this.process,
          elementId: this.process.id,
          subprocesses: this.getMappedSubprocesses(this.subprocesses, this.selectedSubprocessId),
        });
      }
      return treeData;
    },
  },
  methods: {
    getMappedSubprocesses(subprocesses, selectedSubprocessId) {
      const mapSubprocesses = (subprocesses) => {
        if (!Array.isArray(subprocesses)) {
          return subprocesses;
        }

        return subprocesses
          .map((subprocess) => {
            return {
              ...subprocess,
              id: subprocess.elementId,
              subprocesses: mapSubprocesses(subprocess.subprocesses),
            };
          })
          .sort((sub1, sub2) => {
            if (
              Array.isArray(sub1.subprocesses) &&
              sub1.subprocesses.length &&
              (!Array.isArray(sub2.subprocesses) || !sub2.subprocesses.length)
            )
              return -1;
            else if (
              (!Array.isArray(sub1.subprocesses) || !sub1.subprocesses.length) &&
              Array.isArray(sub2.subprocesses) &&
              sub2.subprocesses.length
            )
              return 1;

            if (!sub1.name && !sub2.name) return 0;
            if (!sub1.name)
              return sub1.elementId.toLowerCase().localeCompare(sub2.name.toLowerCase());
            if (!sub2.name)
              return sub1.name.toLowerCase().localeCompare(sub2.elementId.toLowerCase());

            return sub1.name.toLowerCase().localeCompare(sub2.name.toLowerCase());
          });
      };

      return mapSubprocesses(subprocesses);
    },
  },
};
</script>

<style>
.tab-menu {
  /** height of the slider */
  margin-top: -2px;
}
</style>

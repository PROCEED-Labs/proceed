<template>
  <div>
    <v-data-table
      class="resource-table"
      dense
      :headers="headers"
      :items="items"
      :items-per-page="5"
      :mobile-breakpoint="mobileView ? 9999 : 0"
    ></v-data-table>
  </div>
</template>

<script>
export default {
  components: {},
  props: {
    items: Array,
    mobileView: { type: Boolean, default: false },
  },
  data() {
    return {
      headers: [
        {
          text: 'Short Name',
          value: 'shortName',
          width: '25%',
          divider: true,
        },
        { text: 'Long Name', value: 'longName', width: '25%', divider: true },
        { text: 'Description', value: 'description', sortable: false, width: '35%', divider: true },
        { text: 'Quantity', value: 'quantity', width: '15%' },
      ],
    };
  },
  computed: {},
  methods: {},
};
</script>

<style lang="scss" scoped>
.resource-table {
  border: 1px solid lightgrey;
}
</style>

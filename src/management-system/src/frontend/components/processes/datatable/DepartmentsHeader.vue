<template>
  <v-menu internal-activator offset-y>
    <template v-slot:activator="{ on, attrs }">
      <v-chip
        class="ml-1"
        small
        :outlined="groupByDepartments.length === 0"
        :disabled="!uniqueDepartments.length"
        :close="groupByDepartments.length > 0"
        @click:close="$emit('emptyDepartments')"
        v-bind="attrs"
        v-on="on"
      >
        {{ groupByDepartments.length > 0 ? `${groupByDepartments.length} selected` : 'select' }}
      </v-chip>
    </template>
    <v-list>
      <v-list-item
        v-for="(department, index) in uniqueDepartments"
        :key="index"
        :color="department.color"
        :input-value="groupByDepartments.some((dep) => dep.name === department.name)"
        @click="$emit('handleGroupByDepartments', department)"
      >
        <v-list-item-content>
          <v-list-item-title>{{ department.name }}</v-list-item-title>
        </v-list-item-content>
      </v-list-item>
    </v-list>
  </v-menu>
</template>
<script>
export default {
  props: ['groupByDepartments', 'uniqueDepartments'],
};
</script>

<template>
  <v-card class="mt-3">
    <v-expansion-panels>
      <v-expansion-panel>
        <v-expansion-panel-header>Departments</v-expansion-panel-header>
        <v-expansion-panel-content>
          <template>
            <v-simple-table>
              <template v-slot:default>
                <thead>
                  <tr>
                    <th class="text-left">Name</th>
                    <th class="text-left">Number of Processes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="item in departments"
                    :key="item.name"
                    @click="searchForDepartment(item.name)"
                  >
                    <td>{{ item.name }}</td>
                    <td>{{ countProcessInDepartment(item.name) }}</td>
                  </tr>
                </tbody>
              </template>
            </v-simple-table>
          </template>
        </v-expansion-panel-content>
      </v-expansion-panel>
    </v-expansion-panels>
  </v-card>
</template>

<script>
export default {
  name: 'Departments',
  computed: {
    departments() {
      return this.$store.getters['departmentStore/getDepartments'];
    },
    processes() {
      return this.$store.getters['processStore/processes'];
    },
  },
  data() {
    return {};
  },
  methods: {
    searchForDepartment(searchItem) {
      this.$emit('changeSearch', searchItem);
    },
    countProcessInDepartment(department) {
      return this.processes.filter(
        (process) => process.departments && process.departments.includes(department),
      ).length;
    },
  },
};
</script>

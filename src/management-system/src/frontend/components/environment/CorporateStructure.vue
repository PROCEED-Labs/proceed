<template>
  <v-container>
    <v-card>
      <v-tabs active-class="active" v-model="selectedTab" light centered grow>
        <v-tab style="border-bottom: 3px solid #ef9a9a; z-index: 1000"> Factory </v-tab>
        <v-tab style="border-bottom: 3px solid #64b5f6; z-index: 1000"> Building </v-tab>
        <v-tab style="border-bottom: 3px solid green; z-index: 1000"> Working Place </v-tab>
        <v-tab style="border-bottom: 3px solid orange; z-index: 1000"> Area </v-tab>
        <v-tab-item>
          <Factory></Factory>
        </v-tab-item>
        <v-tab-item>
          <Building></Building>
        </v-tab-item>
        <v-tab-item background-color="red lighten-2">
          <WorkingPlace></WorkingPlace>
        </v-tab-item>
        <v-tab-item>
          <BuildingArea></BuildingArea>
        </v-tab-item>
      </v-tabs>
    </v-card>
  </v-container>
</template>

<script>
import Factory from '@/frontend/components/environment/Factory.vue';
import Building from '@/frontend/components/environment/Building.vue';
import WorkingPlace from '@/frontend/components/environment/WorkingPlace.vue';
import BuildingArea from '@/frontend/components/environment/Area.vue';
export default {
  components: { Factory, Building, WorkingPlace, BuildingArea },
  data: () => ({
    selectedTab: null,
  }),

  computed: {},

  methods: {},
};
</script>
<style lang="scss" scoped></style>

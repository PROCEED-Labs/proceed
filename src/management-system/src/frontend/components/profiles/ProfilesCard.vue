<template>
  <v-card id="secondCard">
    <v-card-title>
      <span>Environment Profiles</span>
    </v-card-title>
    <v-data-table
      id="profilesTable"
      hide-default-footer
      :headers="otherEnvironments.headers"
      :items="notClassProfiles"
      :expanded.sync="expanded"
      :singleExpand="false"
      show-expand
    >
      <template v-slot:item.action="{ item }">
        <v-icon @click="$emit('add', item)" color="success">mdi-plus</v-icon>
        <v-icon color="primary" @click="$emit('edit', item)">mdi-pencil</v-icon>
        <v-icon @click="$emit('delete', item)" color="error"> mdi-delete </v-icon>
      </template>
      <template v-slot:expanded-item="{ item, headers }">
        <td :colspan="headers.length">
          <tr v-for="classProfile in classProfilesOfProfiles[item.id]" :key="classProfile.id">
            <td>{{ classProfile.name }}</td>
            <td>{{ classProfile.id }}</td>
            <td>{{ classProfile.type }}</td>
            <td>
              <v-icon @click="$emit('add', classProfile)" color="success"> mdi-plus </v-icon>
              <v-icon color="primary" @click="$emit('edit', classProfile)"> mdi-pencil </v-icon>
              <v-icon @click="$emit('delete', classProfile)" color="error"> mdi-delete </v-icon>
            </td>
          </tr>
        </td>
      </template>
    </v-data-table>
  </v-card>
</template>
<script>
import { mapState } from 'vuex';

export default {
  name: 'ProfilesCard',
  data: () => ({
    expanded: [],
    otherEnvironments: {
      headers: [
        { text: '', value: 'data-table-expand' },
        { text: 'Name', value: 'name', align: 'center' },
        { text: 'ID', value: 'id', align: 'center' },
        { text: 'Type', value: 'type', align: 'center' },
        { text: 'Actions', value: 'action', align: 'center' },
      ],
      environments: [],
    },
    classProfilesOfProfiles: {},
  }),
  computed: mapState({
    profiles() {
      return this.$store.getters['environmentStore/environmentProfiles'];
    },
    notClassProfiles() {
      return this.$store.getters['environmentStore/environmentProfiles'].filter(
        (pr) => pr.type !== 'Class'
      );
    },
  }),
  methods: {
    async getClassProfilesOfProfile(id) {
      const promises = this.profiles.map(
        (profile) =>
          new Promise((resolve) => {
            this.$store.getters['environmentStore/profileJSONById'](profile.id).then((json) => {
              const { extends: parent } = json;
              const isChild = parent === id;
              resolve([isChild, profile]);
            });
          })
      );

      const classProfilesOfProfile = (await Promise.all(promises))
        .filter(([isChild]) => isChild)
        .map(([isChild, profile]) => profile);

      return classProfilesOfProfile;
    },
  },
  watch: {
    // called when list of expanded items changes, computes class profiles of newly expanded profiles
    expanded(newExpanded, oldExpanded) {
      const newProfiles = newExpanded.filter((profile) => !oldExpanded.includes(profile));

      // get mapping from profile id to the class profiles of the profiles that we get asynchronouosly
      let classProfilesOfProfiles = newProfiles.map(async (profile) => [
        profile.id,
        await this.getClassProfilesOfProfile(profile.id),
      ]);

      // await the mapping to resolve and then save the new id to classProfilesMapping
      Promise.all(classProfilesOfProfiles).then((idProfilesMap) => {
        idProfilesMap.forEach(([id, classProfiles]) => {
          this.classProfilesOfProfiles = { ...this.classProfilesOfProfiles, [id]: classProfiles };
        });
      });
    },
  },
};
</script>

<style lang="scss">
/* https://sass-lang.com/documentation/syntax#scss */

#secondCard {
  margin-top: 20px;
  padding-bottom: 10px;
}

#profilesTable {
  margin-left: 15px;
  margin-bottom: 5px;
}
</style>

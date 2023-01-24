<template>
  <v-data-table
    :headers="headers"
    :items="roles"
    :items-per-page="5"
    sort-by="name"
    loading-text="Loading... Please wait"
    :no-data-text="'No roles found.'"
    no-results-text="No matching roles found"
    class="mt-6 row-pointer"
    @click:row="$emit('roleSelected', $event)"
  >
    <template v-slot:item.members="{ item }">
      <v-tooltip right nudge-left="20" v-if="item.name !== '@everyone' && item.name !== '@guest'">
        <template v-slot:activator="{ on, attrs }">
          <span
            class="d-flex align-center"
            v-bind="attrs"
            v-on="on"
            @click.stop.prevent="$emit('membersToView', item)"
          >
            {{ item.members.length }}
            <v-icon class="ml-1" color="grey" small>mdi-account</v-icon>
          </span>
        </template>
        <span>View members</span>
      </v-tooltip>
    </template>
    <template v-slot:item.actions="{ item }">
      <v-menu offset-y transition="scale-transition" origin="center center" left>
        <template v-slot:activator="{ on, attrs }">
          <v-btn icon v-bind="attrs" v-on="on">
            <v-icon>mdi-dots-vertical</v-icon>
          </v-btn>
        </template>
        <v-list>
          <EditRoleButton @roleToEdit="$emit('roleToEdit', item)" />
          <DeleteRoleButton @roleToDelete="$emit('roleToDelete', item)" :role="item" />
        </v-list>
      </v-menu>
    </template>
  </v-data-table>
</template>

<script>
import EditRoleButton from '@/frontend/components/iam/roles/EditRoleButton.vue';
import DeleteRoleButton from '@/frontend/components/iam/roles/DeleteRoleButton.vue';

export default {
  components: {
    EditRoleButton,
    DeleteRoleButton,
  },
  props: {
    roles: {
      type: Array,
      required: true,
    },
    permissions: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      headers: [
        {
          text: 'Roles',
          align: 'start',
          sortable: true,
          value: 'name',
          width: '30%',
        },
        { text: 'Members', value: 'members', width: '0' },
        { text: '', value: 'actions', align: 'end', sortable: false },
      ],
    };
  },
};
</script>

<style scoped>
.row-pointer >>> tbody tr :hover {
  cursor: pointer;
}
</style>

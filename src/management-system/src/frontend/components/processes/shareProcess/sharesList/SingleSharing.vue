<template>
  <div class="d-flex justify-space-between" style="width: 100%">
    <v-list-item-avatar v-if="share.type === TYPE_LINK">
      <v-icon class="red lighten-1" dark> mdi-link-variant </v-icon>
    </v-list-item-avatar>
    <v-list-item-content v-if="share.type === TYPE_LINK">
      <v-list-item-title v-text="'Share public link'" class="text-left"></v-list-item-title>
      <v-list-item-subtitle class="text-left text-truncate">
        <a
          class="text-decoration-none font-weight-medium"
          color="primary"
          :href="share.url"
          target="_blank"
          >Open link <v-icon small color="primary">mdi-open-in-new</v-icon></a
        >
      </v-list-item-subtitle>
    </v-list-item-content>
    <UserSharingAppearance v-else :userId="share.sharedWith" :users="users" :share="share" />
    <v-list-item-action>
      <span class="d-flex">
        <v-tooltip left v-if="getType === TYPE_LINK">
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              v-bind="attrs"
              v-on="on"
              v-if="getType === TYPE_LINK"
              icon
              @click.prevent="copyToClipboard(share.url)"
            >
              <v-icon>mdi-clipboard-text-outline</v-icon>
            </v-btn>
          </template>
          <span>Copy link</span>
        </v-tooltip>
        <v-menu ref="menu" :close-on-content-click="false" bottom left offset-y>
          <template v-slot:activator="{ on, attrs }">
            <v-btn icon v-bind="attrs" v-on="on" class="ml-1">
              <v-icon>mdi-dots-horizontal</v-icon>
            </v-btn>
          </template>
          <v-card class="py-2" width="307">
            <v-list-item-group v-model="permissions" @change="updateShare" color="primary" multiple>
              <v-list-item
                :value="'update'"
                :disabled="!$can('share', process)"
                :class="!$can('share', process) ? 'grey--text' : ''"
              >
                <template v-slot:default="{ active }">
                  <v-list-item-action>
                    <v-checkbox
                      :input-value="active"
                      :disabled="!$can('share', process)"
                    ></v-checkbox>
                  </v-list-item-action>
                  <v-list-item-content>
                    <v-list-item-title>Allow edit</v-list-item-title>
                  </v-list-item-content>
                </template>
              </v-list-item>
              <v-list-item
                v-if="share.type === TYPE_USER"
                :value="'delete'"
                :disabled="!$can('share', process)"
                :class="!$can('share', process) ? 'grey--text' : ''"
              >
                <template v-slot:default="{ active }">
                  <v-list-item-action>
                    <v-checkbox
                      :input-value="active"
                      :disabled="!$can('share', process)"
                    ></v-checkbox>
                  </v-list-item-action>
                  <v-list-item-content>
                    <v-list-item-title>Allow delete</v-list-item-title>
                  </v-list-item-content>
                </template>
              </v-list-item>
              <v-list-item
                v-if="share.type === TYPE_USER"
                :value="'share'"
                :disabled="!$can('share', process)"
                :class="!$can('share', process) ? 'grey--text' : ''"
              >
                <template v-slot:default="{ active }">
                  <v-list-item-action>
                    <v-checkbox
                      :input-value="active"
                      :disabled="!$can('share', process)"
                    ></v-checkbox>
                  </v-list-item-action>
                  <v-list-item-content>
                    <v-list-item-title>Allow share</v-list-item-title>
                  </v-list-item-content>
                </template>
              </v-list-item>
            </v-list-item-group>
            <PasswordAction
              :share.sync="share"
              v-if="share.type === TYPE_LINK"
              @update="updateShare"
            />
            <ExpirationAction :share.sync="share" @update="updateShare" />
            <v-list-item-group v-if="share.type === TYPE_LINK">
              <v-list-item
                @click.prevent="addLinkShare"
                ref="linkItem"
                :disabled="!$can('share', process)"
              >
                <template v-slot:default="{ active }">
                  <v-list-item-action>
                    <v-icon>mdi-plus</v-icon>
                  </v-list-item-action>
                  <v-list-item-content>
                    <v-list-item-title color="black">Add link</v-list-item-title>
                  </v-list-item-content>
                </template>
              </v-list-item>
            </v-list-item-group>
            <v-list-item-group>
              <v-list-item
                @click.prevent="removeShare"
                ref="sharingItem"
                :disabled="!$can('share', process)"
              >
                <template v-slot:default="{ active }">
                  <v-list-item-action>
                    <v-icon>mdi-close</v-icon>
                  </v-list-item-action>
                  <v-list-item-content>
                    <v-list-item-title color="black">Remove sharing</v-list-item-title>
                  </v-list-item-content>
                </template>
              </v-list-item>
            </v-list-item-group>
          </v-card>
        </v-menu>
      </span>
    </v-list-item-action>
  </div>
</template>

<script>
import { iamInterface as api } from '@/frontend/backend-api/index.js';
import {
  TYPE_USER,
  TYPE_LINK,
  PERMISSION_VIEW,
  PERMISSION_UPDATE,
  PERMISSION_DELETE,
  PERMISSION_SHARE,
} from '@/shared-frontend-backend/constants/index.js';
import UserSharingAppearance from '@/frontend/components/processes/shareProcess/sharesList/UserSharingAppearance.vue';
import PasswordAction from '@/frontend/components/processes/shareProcess/sharesList/PasswordAction.vue';
import ExpirationAction from '@/frontend/components/processes/shareProcess/sharesList/ExpirationAction.vue';
import {
  translatePermissionToList,
  translateListToPermission,
} from '@/frontend/helpers/iam/permissions/permissions-handler.js';

export default {
  components: {
    UserSharingAppearance,
    PasswordAction,
    ExpirationAction,
  },
  props: {
    process: {
      type: Object,
    },
    share: {
      type: Object,
      required: true,
    },
    shares: {
      type: Array,
      required: true,
    },
    users: {
      type: Array,
      required: true,
    },
  },
  data() {
    return {
      permissions: [],
      menu: false,
      TYPE_LINK,
      TYPE_USER,
      PERMISSION_UPDATE,
      PERMISSION_DELETE,
      PERMISSION_SHARE,
    };
  },
  watch: {
    async share() {
      const permissions = await translatePermissionToList(this.share.permissions);
      this.permissions = permissions;
    },
  },
  async created() {
    const permissions = await translatePermissionToList(this.share.permissions);
    this.permissions = permissions;
  },
  computed: {
    getType() {
      return this.share.type;
    },
  },
  methods: {
    // copies content of artifact json to clipboard
    copyToClipboard(url = undefined) {
      try {
        if (url) {
          navigator.clipboard.writeText(url);
        }
      } catch (e) {
        throw new Error('Unable to copy to clipboard.');
      }
    },
    async addLinkShare() {
      try {
        const share = {
          resourceType: this.process.type[0].toUpperCase() + this.process.type.slice(1),
          resourceId: this.process.id,
          permissions: PERMISSION_VIEW,
          type: TYPE_LINK,
        };
        const linkShare = await api.addShare(share);
        if (linkShare) {
          const count = this.shares.filter((share) => share.type === TYPE_LINK).length;
          this.shares.splice(count, 0, linkShare);
        }
        this.$refs.linkItem.$el.classList.remove('v-list-item--active');
        this.$refs.menu.save();
      } catch (e) {
        throw new Error(e.toString());
      }
    },
    async updateShare() {
      const { password, expiredAt, note, resourceId, resourceType } = this.share;
      const permissions = await translateListToPermission(this.permissions);
      try {
        await api.updateShareById(this.share.id, {
          permissions,
          password,
          expiredAt,
          note,
          resourceId,
          resourceType,
        });
        this.share.permissions = permissions;
      } catch (e) {
        throw new Error('Unable to update share!');
      }
    },
    async removeShare() {
      try {
        await api.deleteShareById(
          this.share.id,
          `resourceType=${this.share.resourceType}&resourceId=${this.share.resourceId}`,
        );
        this.$refs.sharingItem.$el.classList.remove('v-list-item--active');
        this.$refs.menu.save();
        const index = this.shares.findIndex((sh) => sh.id === this.share.id);
        if (index > -1) this.shares.splice(index, 1);
      } catch (e) {
        this.$refs.sharingItem.$el.classList.remove('v-list-item--active');
        throw new Error('Unable to remove share!');
      }
    },
  },
};
</script>

<style scoped>
.white-bg {
  color: white !important;
}
</style>

<template>
  <v-app>
    <!-- oidc session management iframe -->
    <CheckSession v-if="isAuthenticated && $useSessionManagement === true" />
    <v-hover v-if="!noSidebar" v-slot:default="{ hover }">
      <v-navigation-drawer
        ref="navigation-drawer"
        permanent
        :expand-on-hover="showSidebarHoverable"
        @transitionend="handleSidebarTransistion"
        :mini-variant="showSidebarHoverable"
        app
        width="200"
      >
        <v-fade-transition>
          <v-btn
            v-if="hover && !$vuetify.breakpoint.mdAndDown"
            class="pinIcon"
            x-small
            fab
            dark
            depressed
            color="secondary"
            @click="toggleSidebarHoverable"
            ><v-icon small :style="transformIcon">mdi-pin</v-icon></v-btn
          >
        </v-fade-transition>
        <AuthToggle
          @toggleAuthSection="toggleAuthSection"
          :authSectionOpen="authSectionOpen"
          v-if="$useAuthorization"
        />
        <v-divider></v-divider>
        <Navigation />
        <template slot="append">
          <v-tooltip v-if="isElectron" top>
            <template v-slot:activator="{ on }">
              <div
                @click="$root.engine.toggleSilentMode()"
                class="proceed-logo-copyright-container"
                v-on="on"
              >
                <logo
                  :loading="$root.engine.changingState"
                  :enginePublishing="$root.engine.publishing"
                  :class="
                    !showSidebarHoverable ||
                    ($refs['navigation-drawer'] ? $refs['navigation-drawer'].isMouseover : false)
                      ? 'proceed-logo-expanded'
                      : 'proceed-logo'
                  "
                />
              </div>
            </template>
            <span v-if="$root.engine.changingState">Please wait</span>
            <span v-else-if="$root.engine.publishing">Turn engine off</span>
            <span v-else>Turn engine on</span>
          </v-tooltip>
          <div class="proceed-logo-copyright-container" v-else>
            <logo
              :class="
                !showSidebarHoverable ||
                ($refs['navigation-drawer'] ? $refs['navigation-drawer'].isMouseover : false)
                  ? 'proceed-logo-expanded'
                  : 'proceed-logo'
              "
            />
          </div>
        </template>
      </v-navigation-drawer>
    </v-hover>

    <v-main>
      <router-view :key="$route.fullPath" />
    </v-main>
  </v-app>
</template>

<script>
import Logo from '@/frontend/icons/ProceedLogo.vue';
import AuthToggle from '@/frontend/components/navigation/AuthToggle.vue';
import CheckSession from '@/frontend/components/iam/CheckSession.vue';
import Navigation from '@/frontend/components/navigation/Navigation.vue';
import { mapGetters } from 'vuex';

export default {
  components: {
    Logo,
    AuthToggle,
    Navigation,
    CheckSession,
  },
  data: () => ({
    // if true recomputes the application layout next time the mouse leaves the sidebar
    updateApplicationLayout: false,
    authSectionOpen: false,
  }),
  computed: {
    ...mapGetters({
      isAuthenticated: 'authStore/isAuthenticated',
    }),
    /**
     * This property changes the angle of the pin icon
     */
    transformIcon() {
      return {
        transform: this.showSidebarHoverable ? 'rotate(45deg)' : 'rotate(0deg)',
      };
    },
    showSidebarHoverable: {
      get() {
        return (
          this.$vuetify.breakpoint.mdAndDown ||
          this.$store.getters['userPreferencesStore/getSidePanelHoverable']
        );
      },
      set(newValue) {
        this.$store.dispatch('userPreferencesStore/setSidePanelHoverable', newValue);
      },
    },
    isElectron() {
      return process.env.IS_ELECTRON;
    },
    noSidebar() {
      return (
        this.$router.currentRoute.name === 'instance-view' ||
        this.$router.currentRoute.name === 'project-view'
      );
    },
  },
  methods: {
    toggleSidebarHoverable() {
      this.showSidebarHoverable = !this.showSidebarHoverable;
      // if the sidemenu switches from fixed to unfixed (hoverable)
      if (this.showSidebarHoverable) {
        /** Recomputes the application layout next time the mouse leaves the sidebar
         *
         * Otherwise the v-main would keep the same width as in fixed state.
         * Because when switching from fixed to unfixed state vuetify recomputes the application layout.
         * The problem is that the button to toggle fixing state is placed inside the sidebar itself,
         * and when switching the state the sidebar stays expanded because the hovering state is enabled.
         * Due to that the sidebar width keep the same width while hovering in unfixed state like in fixed state
         * and the recomputing of the application layout is behaving in a wrong way.
         */
        this.updateApplicationLayout = true;
      }
    },
    handleSidebarTransistion(event) {
      if (this.updateApplicationLayout && !this.$refs['navigation-drawer'].isMouseover) {
        // triggers recomputing of the application layout based on the width of the navigation drawer
        // -> affects the left padding of v-main
        this.$refs['navigation-drawer'].callUpdate();
        this.updateApplicationLayout = false;
      }
    },
    // hides the tooltip of the auth section when it is not necessary
    toggleAuthSection() {
      this.authSectionOpen = !this.authSectionOpen;
    },
  },
  mounted() {
    document.addEventListener.call(window, 'notAllowed', (event) => {
      this.openPopup(event.detail.body, event.detail.color);
    });
  },
};
</script>

<style lang="scss">
/* https://sass-lang.com/documentation/syntax#scss */
/* Global CSS */

html,
#app,
main.v-main {
  height: 100%;
}

// to display the pin icon properly
.v-navigation-drawer {
  overflow: visible !important;
  z-index: 199 !important;

  .v-navigation-drawer__content {
    overflow: visible !important;
  }
}

.proceed-logo-copyright-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin-bottom: 20px;
  padding: 8px;

  .proceed-logo {
    width: 110%;
    height: 110%;
  }
  .proceed-logo-expanded {
    width: 80%;
    height: 80%;
  }
}

.pinIcon {
  position: absolute !important;
  top: 0;
  // button has x-small prop => button has a width of 32px,
  // so -16px to place it half in the parent container and half outside
  right: -16px;

  z-index: 200;
}

.v-btn + .v-btn {
  margin-left: 8px;
}

.discovered {
  background-color: rgb(255, 0, 255);
}

div.discovered {
  display: inline-block;
  width: 30px;
  height: 12px;
  margin-top: 40px;
}

*:fullscreen,
*:-webkit-full-screen,
*:-moz-full-screen {
  background-color: #fafafa;
}

.v-dialog--scrollable > .v-card > .v-card__title {
  border-bottom: 1px solid lightgray;
}

.v-dialog--scrollable > .v-card > .v-card__actions {
  border-top: 1px solid lightgray;
}

.v-badge--dot .v-badge__badge::after {
  border-width: 2px !important;
}

.v-list-group:first-of-type > div,
.v-list-group:first-of-type > div:before {
  border-radius: 0px !important;
  margin-bottom: 0px !important;
}
</style>

import Vue from 'vue';
import Router from 'vue-router';
import DeploymentMonitoring from './views/DeploymentMonitoring.vue';
import Process from './views/Process.vue';
import Projects from './views/Projects.vue';
import Templates from './views/Templates.vue';
import Tasklist from './views/Tasklist.vue';
import ProcessBpmnEditor from './views/ProcessBpmnEditor.vue';
import ProjectOverview from './views/ProjectOverview.vue';
import Capabilities from './views/Capabilities.vue';
import EnvironmentProfile from './views/EnvironmentProfile.vue';
import Settings from './views/Settings.vue';
// import UserSettings from './views/UserSettings.vue';
import InstanceViewer from './views/InstanceViewer.vue';
import store from '@/frontend/main.js';
import EnvironmentConfig from './views/EnvironmentConfig.vue';

Vue.use(Router);

const router = new Router({
  routes: [
    {
      path: '/',
      redirect: '/process',
    },
    {
      path: '*',
      redirect: '/process',
    },
    {
      path: '/process',
      name: 'process',
      component: Process,
      meta: {
        auth: [{ action: ['view', 'manage'], subject: 'Process' }],
      },
    },
    {
      path: '/user-profile',
      name: 'user-profile',
      component: () =>
        import(/* webpackChunkName: "user-profile" */ '@/frontend/views/UserProfile.vue'),
      meta: {
        auth: true,
      },
    },
    {
      path: '/process/bpmn/:id',
      name: 'edit-process-bpmn',
      component: ProcessBpmnEditor,
    },
    {
      path: '/projects/bpmn/:id',
      name: 'edit-project-bpmn',
      component: ProcessBpmnEditor,
    },
    {
      path: '/templates/bpmn/:id',
      name: 'edit-template-bpmn',
      component: ProcessBpmnEditor,
    },
    {
      path: '/projects/status/:id',
      name: 'show-project-bpmn',
      component: ProjectOverview,
    },
    {
      path: '/projects/status/:id/instance/:instanceId',
      name: 'project-view',
      component: InstanceViewer,
      props: ({ params }) => ({
        processDefinitionsId: params.id,
        instanceId: params.instanceId,
      }),
    },
    {
      path: '/projects',
      name: 'projects',
      component: Projects,
      meta: {
        auth: [{ action: ['view'], subject: 'Project' }],
      },
    },
    {
      path: '/templates',
      name: 'templates',
      component: Templates,
      meta: {
        auth: [{ action: ['view'], subject: 'Template' }],
      },
    },
    {
      path: '/machines',
      name: 'machines',
      component: () => import(/* webpackChunkName: "machines" */ '@/frontend/views/Machines.vue'),
      meta: {
        auth: [{ action: ['view', 'manage'], subject: 'Machine' }],
      },
    },
    {
      path: '/iam',
      name: 'iam',
      component: () => import(/* webpackChunkName: "iam" */ '@/frontend/views/IAM.vue'),
      meta: {
        auth: [
          { action: ['manage', 'manage-permissions'], subject: 'Role' },
          { action: ['manage', 'manage-roles', 'manage-groups'], subject: 'User' },
        ],
      },
    },
    {
      path: '/executions',
      name: 'executions',
      component: () =>
        import(/* webpackChunkName: "executions" */ '@/frontend/views/Deployments.vue'),
      meta: {
        auth: [{ action: ['view', 'manage'], subject: 'Execution' }],
      },
    },
    {
      path: '/environment-config',
      name: 'environment-config',
      component: EnvironmentConfig,
      meta: {
        auth: true,
      },
    },
    {
      path: '/executions/:id',
      name: 'deployment-overview',
      component: DeploymentMonitoring,
    },
    {
      path: '/executions/:id/instance/:instanceId',
      name: 'instance-view',
      component: InstanceViewer,
      props: ({ params }) => ({
        processDefinitionsId: params.id,
        instanceId: params.instanceId,
      }),
    },
    {
      path: '/tasklist',
      name: 'tasklist',
      component: Tasklist,
      meta: {
        auth: [{ action: ['view'], subject: 'Task' }],
      },
    },
    {
      path: '/capabilities',
      name: 'capabilities',
      component: Capabilities,
    },
    {
      path: '/environment-profile',
      name: 'environment-profile',
      component: EnvironmentProfile,
      meta: {
        auth: true,
      },
    },
    {
      path: '/settings',
      name: 'settings',
      component: Settings,
      meta: {
        auth: true,
      },
    },
  ],
});

export default router;

// router guard to check permissions before each route change
router.beforeEach((to, from, next) => {
  if (to.matched.some((record) => record.meta.auth)) {
    if (Array.isArray(to.meta.auth)) {
      to.meta.auth.forEach((requiredPermissions) => {
        if (Array.isArray(requiredPermissions.action)) {
          requiredPermissions.action.forEach((action) => {
            if (store.getters['authStore/ability'].can(action, requiredPermissions.subject)) next();
          });
        } else {
          if (
            store.getters['authStore/ability'].can(
              requiredPermissions.action,
              requiredPermissions.subject
            )
          )
            next();
        }
      });
    }
    if (
      typeof to.meta.auth === 'boolean' &&
      to.meta.auth === true &&
      (!store.getters['authStore/getConfig'].useAuthorization ||
        store.getters['authStore/isAuthenticated'])
    )
      next();
  } else {
    next();
  }
  next(false);
});

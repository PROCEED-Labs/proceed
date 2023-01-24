import restRequest from '@/frontend/backend-api/ms-api-interface/rest.js';

async function getResources() {
  const resources = await restRequest('resources');
  return resources;
}

export default {
  getResources,
};

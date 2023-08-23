import restRequest from '@/frontend/backend-api/ms-api-interface/rest.js';

async function getShares(query) {
  const shares = await restRequest('shares', query);
  return shares;
}

async function getShareById(shareId) {
  const share = await restRequest(`shares/${shareId}`);
  return share;
}

async function addShare(share) {
  const roleId = await restRequest('shares', undefined, 'POST', 'application/json', share);
  return roleId;
}

async function updateShare(shareId, share) {
  const updatedShare = await restRequest(
    `shares/${shareId}`,
    undefined,
    'PUT',
    'application/json',
    share,
  );
  return updatedShare;
}

async function deleteShareById(shareId, query) {
  const id = await restRequest(`shares/${shareId}`, query, 'DELETE');
  return id;
}

export default { getShares, getShareById, addShare, updateShare, deleteShareById };

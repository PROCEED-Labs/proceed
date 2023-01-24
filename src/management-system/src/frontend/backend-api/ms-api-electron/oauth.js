// mocked callback response for electron
async function handleOauthCallback() {
  return {
    isLoggedIn: false,
    config: {},
    user: {},
    permissions: {},
    handled: false,
    csrfToken: '',
  };
}

// mocked empty userinfo object for electron
async function getUserInfo() {
  return {};
}

export default { handleOauthCallback, getUserInfo };

import loginHandler from './loginHandler.js';
import logoutHandler from './logoutHandler.js';
import userinfoHandler from './userinfoHandler.js';
import tokenHandler from './tokenHandler.js';

export default {
  ...loginHandler,
  ...logoutHandler,
  ...userinfoHandler,
  ...tokenHandler,
};

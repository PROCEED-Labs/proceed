import EngineInterface from './EngineInterface.js';
import DataInterface from './DataInterface.js';
import EngineNetworkInterface from './EngineNetworkInterface.js';
import ProcessInterface from './ProcessInterface.js';
import DeploymentInterface from './DeploymentInterface.js';
import _5thIndustryInterface from './5thIndustryInterface.js';
import eventHandler from './event-system/EventHandler.js';
import IAMInterface from './IAMInterface.js';
import OAuthClient from './OAuthClient.js';

export let isAuthenticated = false;
export let isAuthRequired = false;
export let userId = null;

export function setIsAuthenticated(isAuth) {
  isAuthenticated = isAuth;
}

export function setIsAuthRequired(authRequired) {
  isAuthRequired = authRequired;
}

export function setUserId(id) {
  userId = id;
}

const oauthClient = new OAuthClient();

const engineInterface = new EngineInterface();

const dataInterface = new DataInterface();

const engineNetworkInterface = new EngineNetworkInterface();

const processInterface = new ProcessInterface();

const deploymentInterface = new DeploymentInterface();

const iamInterface = new IAMInterface();

const fifthIndustryInterface = new _5thIndustryInterface();

export {
  engineInterface,
  eventHandler,
  dataInterface,
  engineNetworkInterface,
  processInterface,
  deploymentInterface,
  iamInterface,
  oauthClient,
  fifthIndustryInterface,
};

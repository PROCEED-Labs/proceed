import https from 'https';
import fse from 'fs-extra';
import path from 'path';
import store from '../../data/store.js';
import { getAppDataPath } from '../../data/fileHandling.js';
import { updateProcess } from '../../data/process.js';
import logger from '../../logging.js';
import { getBackendConfig } from '../../data/config.js';

import { immediateDeploymentInfoRequest } from '../process/polling.js';
import { migrateInstances } from '../process/instance.js';
import { getDeployments } from '../../data/deployment.js';
import ExecutionQueue from '../../../../shared-frontend-backend/helpers/execution-queue.js';
import { processEndpoint } from '../ms-engine-communication/module.js';

import bpmnEx from '@proceed/bpmn-helper';
const {
  toBpmnObject,
  toBpmnXml,
  getElementById,
  setMetaData,
  setDefinitionsVersionInformation,
  updatePerformersOnElementById,
} = bpmnEx;

import versioningHelpers from '../../../../shared-frontend-backend/helpers/processVersioning.js';
const { convertToEditableBpmn } = versioningHelpers;

import messagingEx from '@proceed/system';
const { messaging } = messagingEx;

import { enable5thIndustryIntegration } from '../../../../../../../FeatureFlags.js';

import {
  minimalPlansQuery,
  minimalPlanQuery,
  planCreationTemplateQuery,
  inspectionPlanCreationMutation,
  atomicInspectionPlanMutation,
  userQuery,
} from './queries.js';

let clientId;
let clientSecret;
let clientEndpoint;
let clientToken;

function asyncHTTPSRequest(url, options, query) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (d) => {
        data = `${data}${d}`;
      });
      res.on('end', () => {
        let response;
        try {
          response = JSON.parse(data);
        } catch (err) {
          reject(
            `Unable to parse response from server. Server responded with status code ${res.statusCode}`
          );
        }

        resolve(response);
      });
    });

    req.on('error', (err) => reject(err));
    req.write(query);
    req.end();
  });
}

async function authorizeWith5i() {
  // get service account data
  let serviceData;
  try {
    serviceData = JSON.parse(
      fse.readFileSync(
        path.join(getAppDataPath(), 'Config', '5thIndustry_service_account.json'),
        'utf-8'
      )
    );

    clientId = serviceData.clientId;
    clientSecret = serviceData.clientSecret;
    clientEndpoint = serviceData.endpoint;

    // base64 encode the account data
    const authorization = Buffer.from(
      `${serviceData.clientId}:${serviceData.clientSecret}`
    ).toString('base64');

    const query = {
      grant_type: 'client_credentials',
      client_id: serviceData.clientId,
      scope: 'profit-gateway/inspectionPlans.all',
    };

    const encodedQuery = new URLSearchParams(query).toString();

    const response = await asyncHTTPSRequest(
      serviceData.endpoint,
      {
        method: 'POST',
        headers: {
          ['Content-Type']: 'application/x-www-form-urlencoded',
          ['Content-Length']: Buffer.byteLength(encodedQuery),
          Authorization: `Basic ${authorization}`,
        },
      },
      encodedQuery
    );

    if (response.error) {
      throw response.error;
    }

    if (response.access_token) {
      clientToken = `${response.token_type} ${response.access_token}`;

      // make sure to keep the access token up to date
      setTimeout(authorizeWith5i, (response.expires_in - 60) * 1000);

      logger.info(`Successfully requested an access token from 5thIndustry!`);
    }
  } catch (err) {
    // Log failure only as debug log
    logger.debug(`Failed to get 5thIndustry Service Account Authorization. Reason: ${err}`);
    return;
  }
}

if (enable5thIndustryIntegration) {
  authorizeWith5i();
}

export function get5thIndustryServiceAccountData() {
  // Only return something when there was at least one token successfully requested with the service account data
  return clientToken ? { id: clientId, secret: clientSecret, endpoint: clientEndpoint } : null;
}

export function get5thIndustryAuthorization() {
  let authorization = clientToken;

  if (!authorization) {
    authorization = store.get('userPreferences').config.user5thIndustryAuthorization;
  }

  if (!authorization.startsWith('Bearer ')) {
    authorization = `Bearer ${authorization}`;
  }

  return authorization;
}

async function requestData(body) {
  const authorization = get5thIndustryAuthorization();

  const options = {
    method: 'POST',
    headers: {
      authorization,
      ['Content-Type']: 'application/json',
      ['Content-Length']: Buffer.byteLength(body),
    },
  };

  const response = await asyncHTTPSRequest(getBackendConfig()._5thIndustryAPIURL, options, body);

  if (response.errors) {
    throw response.errors[0].message;
  } else {
    return response.data;
  }
}

async function getUserId() {
  const body = JSON.stringify({
    query: userQuery,
    variables: {
      a: true,
    },
  });

  try {
    const result = await requestData(body);
    return result.getUsers[0]._id;
  } catch (err) {
    throw new Error(err);
  }
}

export async function getInspectionPlans(type = 'entity') {
  const body = JSON.stringify({
    query: minimalPlansQuery,
    variables: {
      type,
      sort: '{"createdBy.createdAt": -1}',
      limit: 100,
    },
  });

  try {
    const result = await requestData(body);
    return result.getInspectionPlans.inspectionPlans;
  } catch (err) {
    throw new Error(err);
  }
}

export async function getInspectionPlanData(
  inspectionPlanId,
  type = 'entity',
  query = minimalPlanQuery
) {
  const body = JSON.stringify({
    query,
    variables: {
      id: inspectionPlanId,
      type,
    },
  });

  try {
    const result = await requestData(body);
    return result.getInspectionPlan.inspectionPlan;
  } catch (err) {
    throw new Error(err);
  }
}

async function getNewPlanData(planInformation, templateId) {
  let userId;

  // use the user id of the account that is used for communication with the 5thIndustry App
  if (clientToken) {
    userId = clientId;
  } else {
    userId = await getUserId();
  }

  if (!userId) {
    throw new Error('Could not get user id to create 5thIndustry Plan with.');
  }

  let planData;
  const time = new Date().toISOString();

  if (templateId) {
    planData = await getInspectionPlanData(templateId, 'template', planCreationTemplateQuery);

    planData.templateId = templateId;
    delete planData._id;
  } else {
    planData = {
      legalOwnerLogo: {},
      numberOfConflicts: 0,
      assemblyGroup: [],
    };
  }

  planData.title = [{ language: 'EN', value: planInformation.title }];
  planData.customer = planInformation.customer;
  planData.customerOrderNo = planInformation.customerOrderNo;
  planData.jobName = planInformation.jobName;

  planData.documentType = 'IuT-Plan';

  planData.revisionHistory = [
    {
      editor: {
        accountID: userId,
      },
      revisionNumber: 'AA',
      revisionDate: time,
    },
  ];
  planData.createdBy = {
    createdAt: time,
    userID: userId,
  };

  planData.workStatus = 'open';
  planData.status = 'draft';

  return planData;
}

export async function createPlan(planInformation, templateId) {
  const planData = await getNewPlanData(planInformation, templateId);

  const body = JSON.stringify({
    operationName: 'createInspectionPlan',
    query: inspectionPlanCreationMutation,
    variables: {
      type: 'entity',
      plan: planData,
    },
  });

  try {
    const result = await requestData(body);
    return result.createInspectionPlan.inspectionPlan;
  } catch (err) {
    throw new Error(err);
  }
}

/**
 * Sends a request to the 5thIndustry backend to change attributes of an existing plan
 *
 * @param {String} inspectionPlanId
 * @param {Object} values the entries to change as key value pairs
 * @param {String} type what kind of plan is supposed to be changed (either "template" or "entity")
 */
async function updateInspectionPlan(inspectionPlanId, values, type) {
  const body = JSON.stringify({
    operationName: 'atomicInspectionPlan',
    query: atomicInspectionPlanMutation,
    variables: {
      type,
      atomics: [
        {
          inspectionPlanId,
          operation: 'update',
          values,
        },
      ],
    },
  });

  await requestData(body);
}

/**
 * Will set a plan into a in progress state to signal that it is being executed
 *
 * @param {String} inspectionPlanId
 */
export async function start5thIndustryPlan(inspectionPlanId) {
  try {
    await updateInspectionPlan(inspectionPlanId, {
      status: 'released',
      workStatus: 'inWork',
    });
  } catch (err) {
    throw new Error(`Could not update the 5thIndustry inspection plan. 5thIndustryError: ${err}.`);
  }
}

/**
 * Will set the plan back to an open state to signal that is currently not being executed (might be necessary when something in the linked process fails)
 *
 * @param {String} inspectionPlanId
 */
export async function stop5thIndustryPlan(inspectionPlanId) {
  await updateInspectionPlan(inspectionPlanId, {
    workStatus: 'open',
  });
}

// currently existing subscriptions for different projects (we want only one subscription per project)
const subscriptions = {};

/**
 * Subscribes for contract information for tasks in the instance of the project with the given id
 *
 * Will use incoming information to adapt the bpmn and to migrate the instance to the new bpmn
 *
 * @param {String} processDefinitionsId
 * @param {Object} mqttServerInfo
 */
export async function listenFor5thIndustryContractInformation(
  processDefinitionsId,
  { url, user: username, password }
) {
  // we need to ensure that we only execute one bpmn change at a time
  const queue = new ExecutionQueue();

  // ensure that there is only a single subscription per project
  // (the project might be restarted which would lead to the callback being registered (and therefore executed) twice without this)
  if (subscriptions[processDefinitionsId]) {
    await messaging.unsubscribe(
      '2/5I-DI5App/event/contractClosed',
      subscriptions[processDefinitionsId],
      url,
      { username, password, clientIdPrefix: 'MS-' }
    );
    subscriptions[processDefinitionsId] = undefined;
  }

  // the callback that should be called every time new contract information gets published
  const onMessage = async (_, message) => {
    try {
      const contractInfo = JSON.parse(message);
      // filter out information that is not related to this project
      if (processDefinitionsId !== contractInfo.processId) return;

      logger.debug(
        `Received contract information for project ${processDefinitionsId} from 5thIndustry`
      );

      // avoid multiple simultaneous adaptations of a project
      await queue.enqueue(async () => {
        // get the newest deployment information (for the deployment of the project we are looking at)
        await immediateDeploymentInfoRequest();

        logger.debug(
          `Updating the bpmn of project ${processDefinitionsId} with contract information`
        );

        const deployment = getDeployments()[processDefinitionsId];
        // get the data we need to adapt the project
        const runningInstance = Object.keys(deployment.runningInstances)[0];
        const currentVersion = deployment.instances[runningInstance].processVersion;
        const versionInfo = deployment.versions.find((info) => info.version == currentVersion);
        const { bpmn } = versionInfo;

        const {
          stepId,
          supplierCosts,
          supplierName,
          supplierTimePlannedOccurrence,
          supplierTimePlannedEnd,
        } = contractInfo;

        const bpmnObj = await toBpmnObject(bpmn);

        if (!stepId || !getElementById(bpmnObj, stepId))
          throw new Error('Could not find an element with the given id in the project');

        // add the data from the matching to the bpmn
        await setMetaData(bpmnObj, stepId, {
          costsPlanned: supplierCosts && `${supplierCosts}`, // the function will throw if the given value is not a string
          timePlannedOccurrence:
            supplierTimePlannedOccurrence && `${supplierTimePlannedOccurrence}`,
          timePlannedEnd: supplierTimePlannedEnd && `${supplierTimePlannedEnd}`,
        });

        // add the supplier as the performer of the task (the supplier is added as a group type performer)
        await updatePerformersOnElementById(bpmnObj, stepId, [
          { id: '', meta: { groupname: supplierName } },
        ]);

        // add version information to the bpmn
        const newVersion = +new Date();
        await setDefinitionsVersionInformation(bpmnObj, {
          version: newVersion,
          versionName: `Supplier info for ${stepId}`,
          versionDescription: `Adding supplier info that was provided by 5thIndustry to task ${stepId}.`,
          versionBasedOn: currentVersion,
        });

        const element = getElementById(bpmnObj, stepId);

        const flowElementMapping = {};

        if (element && element.incoming && element.incoming.length) {
          // ensure that the task is restarted with the new performer data for the data to show up in the tasklist
          // this will only apply should the token have reached the task before the contract was received (otherwise the instance proceeds on the new bpmn as if nothing happened eventually reaching the changed user task)
          flowElementMapping[stepId] = [element.incoming[0].id];
        }

        // transfer the project instance to the new bpmn
        const newVersionBpmn = await toBpmnXml(bpmnObj);
        await processEndpoint.deployProcess(deployment.machines[0], newVersionBpmn);
        await migrateInstances(
          processDefinitionsId,
          currentVersion,
          newVersion,
          [runningInstance],
          { flowElementMapping }
        );

        // update the editable version of the project to contain the changes that were made
        const editableBpmn = await convertToEditableBpmn(newVersionBpmn);
        await updateProcess(processDefinitionsId, editableBpmn);

        logger.debug(`Updated project ${processDefinitionsId} with contract information`);
      });
    } catch (err) {
      logger.debug(`Failed to apply 5thIndustry contract information: ${message}`);
    }
  };

  logger.debug('Subscribing for contract information provided by 5thIndustry');

  // subscribe to the topic that the task supplier matchings are posted to
  await messaging.subscribe('2/5I-DI5App/event/contractClosed', onMessage, url, {
    username,
    password,
    clientIdPrefix: 'MS-',
  });

  subscriptions[processDefinitionsId] = onMessage;
}

const system = require('@proceed/system');
const { getMetaData, getProcessIds } = require('@proceed/bpmn-helper');

let serviceAccountId;
let serviceAccountSecret;
let serviceAccountEndpoint;

let authorization;

// setup endpoints that allow to set a service account or an authorization token to be used for 5thIndustry requests
function setup5thIndustryEndpoints() {
  system.network.put(`/5thIndustry/service-account`, { cors: true }, async (req) => {
    const { id, secret, endpoint } = req.body;

    serviceAccountId = id;
    serviceAccountSecret = secret;
    serviceAccountEndpoint = endpoint;

    return '';
  });

  system.network.put(`/5thIndustry/authorization`, { cors: true }, async (req) => {
    const { authorization: auth } = req.body;

    authorization = auth;
  });
}

/**
 * Will try to create a valid 5thIndustry Authorization token using the service account data provided through the REST API
 *
 * @throws Will throw an error if there is no service account data
 */
async function update5thIndustryAuthorization() {
  if (!serviceAccountId) {
    throw new Error(
      'There is no service account data to create a new 5thIndustry authorization token!'
    );
  }

  // base64 encode the account data
  const encodedServiceData = Buffer.from(`${serviceAccountId}:${serviceAccountSecret}`).toString(
    'base64'
  );

  const query = {
    grant_type: 'client_credentials',
    client_id: serviceAccountId,
    scope: 'profit-gateway/inspectionPlans.all',
  };

  const encodedQuery = new URLSearchParams(query).toString();

  const { body } = await system.network.sendData(
    serviceAccountEndpoint,
    undefined,
    '',
    'POST',
    'application/x-www-form-urlencoded',
    encodedQuery,
    {
      Authorization: `Basic ${encodedServiceData}`,
    }
  );

  const { token_type, access_token } = JSON.parse(body);

  authorization = `${token_type} ${access_token}`;
}

/**
 * Will send a request to 5thIndustries GraphQL API
 *
 * @param {Object} data the request data to send
 * @returns {Object} the response body
 * @throws Throws an exception if the GraphQL API returns an error code
 */
async function sendGraphQLRequest(engine, data, address) {
  if (!authorization) {
    await update5thIndustryAuthorization();
  }
  try {
    const result = await system.network.sendData(
      address,
      undefined,
      '',
      'POST',
      'application/json',
      data,
      {
        authorization,
      }
    );

    return JSON.parse(result.body);
  } catch (err) {
    let errorMessage = 'Request to 5thIndustry failed!';

    if (err.body && typeof err.body === 'string') {
      const { errors } = JSON.parse(err.body);

      // check if the error is due to the engine lacking authentification
      if (
        errors.length &&
        errors[0].extensions &&
        errors[0].extensions.code === 'UNAUTHENTICATED'
      ) {
        // try to get an authorization token and repeat the request
        try {
          await update5thIndustryAuthorization();

          // This recursive function call should not lead to an infinite recursion since we expect the authorization to be valid for the next request
          return sendGraphQLRequest(engine, data, address);
        } catch (err) {
          throw new Error(
            'Unable to communicate with the 5thIndustry Application due to missing authorization. There was also no way provided to obtain an authorization.'
          );
        }
      }

      errorMessage = 'Request to 5thIndustry returned ';
      errorMessage += errors.length > 1 ? 'errors: ' : 'error: ';
      errors.forEach((error) => (errorMessage += `${error.message}; `));

      errorMessage = `${errorMessage.substring(0, errorMessage.length - 2)}.`;
    }

    throw new Error(errorMessage);
  }
}

/**
 * Will set an attribute on a specific inspection order that signals that the linked User Task is either currently active or not active
 *
 * @param {Object} engine the engine of the process the user task occured in
 * @param {Object} _5iInformation 5thIndustry data needed to match the user task to a specific inspection order in 5thIndustry App
 * @param {String} _5iInformation.apiAddress the url of the 5thIndustry GraphQL API
 * @param {String} _5iInformation.inspectionPlanId the inspection plan the inspection order is in (the plan that is linked to the process)
 * @param {String} _5iInformation.assemblyGroupId the assembly group the inspection order is in (an assembly group bundles multiple manufacturing steps)
 * @param {String} _5iInformation.manufacturingStepId the manufacturing step the inspection order is in (a manufacturing step contains multiple inspection orders)
 * @param {String} _5iInformation.inspectionOrderId id of the specific inspection order we want to target
 * @param {Boolean} tokenState if the token is currently on the linked user task or not
 * @throw Will throw if setting the attribute leads to an error inside the 5thIndustry App
 */
async function setInspectionOrderTokenState(engine, _5iInformation, tokenState) {
  await sendGraphQLRequest(
    engine,
    {
      operationName: 'atomicInspectionPlan',
      query: `
      mutation atomicInspectionPlan($atomics: [inspectionPlanAtomic!]!, $type: entityType) {
        atomicInspectionPlan(atomics: $atomics, type: $type) {
        code
        success
        message
        __typename
        }
       }
      `,
      variables: {
        type: 'entity',
        atomics: [
          {
            inspectionPlanId: _5iInformation.inspectionPlanId,
            operation: 'update',
            // we have to use this to only change a specific attribute of a nested attribute
            childrenIds: {
              assemblyGroupId: _5iInformation.assemblyGroupId,
              manufacturingStepId: _5iInformation.manufacturingStepId,
              inspectionOrderId: _5iInformation.inspectionOrderId,
            },
            path: 'assemblyGroup.$[assemblyGroupId].manufacturingStep.$[manufacturingStepId].inspectionOrders.$[inspectionOrderId]',
            // the inspection order attribute we want to change
            values: { hasBpnmToken: tokenState },
          },
        ],
      },
    },
    _5iInformation.apiAddress
  );
}

class _5IPlanNotRunningError extends Error {
  constructor(message) {
    super(message);
    this.name = '_5IPlanNotRunningError';
  }
}

/**
 * Requests some information about a specific inspection order that we need to check if the order was finished
 *
 * @param {Object} engine the engine of the process the user task occured in
 * @param {Object} _5iInformation 5thIndustry data needed to match the user task to a specific inspection order in 5thIndustry App
 * @param {String} _5iInformation.apiAddress the url of the 5thIndustry GraphQL API
 * @param {String} _5iInformation.inspectionPlanId the inspection plan the inspection order is in (the plan that is linked to the process)
 * @param {String} _5iInformation.assemblyGroupId the assembly group the inspection order is in (an assembly group bundles multiple manufacturing steps)
 * @param {String} _5iInformation.manufacturingStepId the manufacturing step the inspection order is in (a manufacturing step contains multiple inspection orders)
 * @param {String} _5iInformation.inspectionOrderId id of the specific inspection order we want to target
 * @returns {Object} the order information
 */
async function getPlanInspectionOrder(engine, _5iInformation) {
  const { data } = await sendGraphQLRequest(
    engine,
    {
      query: `
      query getInspectionPlan($id: ID!, $type: entityType){
        getInspectionPlan(_id: $id, type: $type) {
          inspectionPlan {
            workStatus
            status
            assemblyGroup {
              _id
              manufacturingStep {
                _id
                inspectionOrders {
                  _id
                  inspectionReportID
                  reportProgress {
                    total
                    completed
                  }
                }
              }
            }
          }
        }
      }`,
      variables: {
        id: _5iInformation.inspectionPlanId,
        type: 'entity',
      },
    },
    _5iInformation.apiAddress
  );

  if (!data.getInspectionPlan) {
    throw new _5IPlanNotRunningError(
      "Inspection Plan linked to process doesn't seem to exist anymore!"
    );
  }

  const { inspectionPlan } = data.getInspectionPlan;

  // throw an error if the plan was set back into a non executing state
  if (inspectionPlan.status !== 'released' || inspectionPlan.workStatus === 'open') {
    throw new _5IPlanNotRunningError(
      'Inspection Plan linked to process is not in an executing state anymore!'
    );
  }

  // find the correct inspection order nested inside the inspection plan
  const { assemblyGroup } = inspectionPlan;
  const group = assemblyGroup.find((g) => g._id === _5iInformation.assemblyGroupId);
  const step = group.manufacturingStep.find((s) => s._id === _5iInformation.manufacturingStepId);

  return step.inspectionOrders.find((o) => o._id === _5iInformation.inspectionOrderId);
}

/**
 * Will setup everything that is needed to handle a User Task that is using 5thIndustry as its implementation
 *
 * @param {Object} userTask the user task object from the neo engine
 * @param {Object} engine the proceed engine instance associated with the process the user task occured in
 */
async function handle5thIndustryUserTask(userTask, engine) {
  // get the assembly group, manufacturing step and inspection order ids from the process bpmn
  const bpmn = engine._versionBpmnMapping[userTask.definitionVersion];
  const [processId] = await getProcessIds(bpmn);
  const {
    '_5i-Assembly-Group-ID': assemblyGroupId,
    '_5i-Manufacturing-Step-ID': manufacturingStepId,
    '_5i-Inspection-Order-ID': inspectionOrderId,
  } = await getMetaData(bpmn, userTask.id);

  // get the id of the inspection plan from the bpmn
  const {
    '_5i-Inspection-Plan-ID': inspectionPlanId,
    '_5i-API-Address': apiAddress,
    '_5i-Application-Address': applicationAddress,
  } = await getMetaData(bpmn, processId);

  const _5iInformation = {
    apiAddress,
    applicationAddress,
    inspectionPlanId,
    inspectionOrderId,
    assemblyGroupId,
    manufacturingStepId,
  };

  activateInspectionOrder(engine, userTask, _5iInformation);
}

/**
 * Will signal to the 5thIndustry Application that the task linked to an inspection order has become active
 *
 * @param {Object} engine the engine of the process the user task occured in
 * @param {Object} userTask the user task that has become active
 * @param {Object} _5iInformation 5thIndustry data needed to match the user task to a specific inspection order in 5thIndustry App
 * @param {String} _5iInformation.apiAddress the url of the 5thIndustry API that needs to be used when activating the inspection order
 * @param {String} _5iInformation.applicationAddress the url of the 5thIndustry APP that is used to link to the App from the ui of the engine
 * @param {String} _5iInformation.inspectionPlanId the inspection plan the inspection order is in (the plan that is linked to the process)
 * @param {String} _5iInformation.assemblyGroupId the assembly group the inspection order is in (an assembly group bundles multiple manufacturing steps)
 * @param {String} _5iInformation.manufacturingStepId the manufacturing step the inspection order is in (a manufacturing step contains multiple inspection orders)
 * @param {String} _5iInformation.inspectionOrderId id of the specific inspection order we want to target
 */
async function activateInspectionOrder(engine, userTask, _5iInformation) {
  try {
    // check if the inspection order is part of an existing plan and set a link to it in the user task
    const { inspectionReportID } = await getPlanInspectionOrder(engine, _5iInformation);
    userTask[
      '_5thIndustryInspectionOrderLink'
    ] = `${_5iInformation.applicationAddress}/protocols/${_5iInformation.inspectionPlanId}/${inspectionReportID}`;

    // set inspection order linked to the user task to being active
    await setInspectionOrderTokenState(engine, _5iInformation, true);
    engine._log.info({
      msg: `Activated 5thIndustry Inspection Order linked to User Task "${
        userTask.name || userTask.id
      }".`,
      instanceId: userTask.processInstance.id,
    });

    // add userTask to list of open user tasks so it is displayed in the ui
    engine.userTasks.push(userTask);
    // start polling the 5thIndustry Application for the progress on the inspection order
    pollInspectionOrderProgress(engine, userTask, _5iInformation);
  } catch (err) {
    engine._log.error({
      msg: `Unable to setup handling for 5thIndustry implementation of User Task "${
        userTask.name || userTask.id
      }". Reason: ${err.message}`,
      instanceId: userTask.processInstance.id,
    });

    if (err instanceof _5IPlanNotRunningError) {
      // abort the instance if the inspection plan that was linked to from the process is not active anymore
      engine.abortInstance(
        userTask.processInstance.id,
        `Aborting process instance due to problems with the associated 5thIndustry Plan. Id =${userTask.processInstance.id}`
      );
    } else {
      // repeat the request
      system.timer.setTimeout(() => {
        activateInspectionOrder(engine, userTask, _5iInformation);
      }, 5000);
    }
  }
}

/**
 * Will poll the 5thIndustry App to see if the Inspection Order linked to the user task has been finished
 *
 * @param {Object} engine an instance of the proceed engine in which the process is executed in
 * @param {Object} userTask the user task that has become active insde the process
 * @param {Object} _5iInformation 5thIndustry data needed to match the user task to a specific inspection order in 5thIndustry App
 * @param {String} _5iInformation.apiAddress the url of the 5thIndustry API that needs to be used when activating the inspection order
 * @param {String} _5iInformation.inspectionPlanId the inspection plan the inspection order is in (the plan that is linked to the process)
 * @param {String} _5iInformation.assemblyGroupId the assembly group the inspection order is in (an assembly group bundles multiple manufacturing steps)
 * @param {String} _5iInformation.manufacturingStepId the manufacturing step the inspection order is in (a manufacturing step contains multiple inspection orders)
 * @param {String} _5iInformation.inspectionOrderId id of the specific inspection order we want to target
 */
async function pollInspectionOrderProgress(engine, userTask, _5iInformation) {
  const instance = engine.getInstance(userTask.processInstance.id);
  if (!instance || instance.isEnded()) {
    setInspectionOrderTokenState(engine, _5iInformation, false);
    // exit the polling loop if the instance has ended for some reason
    return;
  }

  try {
    // request inspection order information from 5thIndustry
    const order = await getPlanInspectionOrder(engine, _5iInformation);

    // check if the inspection order was completed
    if (order.reportProgress.completed === order.reportProgress.total) {
      // signal task success to neo engine, remove token flag from inspection order in 5thIndustry App and stop polling
      engine._log.info({
        msg: `5thIndustry Inspection Order linked to User Task "${
          userTask.name || userTask.id
        }" was completed.`,
        instanceId: userTask.processInstance.id,
      });
      engine.completeUserTask(userTask.processInstance.id, userTask.id, {});
      setInspectionOrderTokenState(engine, _5iInformation, false);
      return;
    }
  } catch (err) {
    engine._log.error({
      msg: err.message,
      instanceId: userTask.processInstance.id,
    });

    if (err instanceof _5IPlanNotRunningError) {
      engine.abortInstance(
        userTask.processInstance.id,
        `Aborting process instance due to problems with the associated 5thIndustry Plan. Id =${userTask.processInstance.id}`
      );
      return;
    }
  }

  // repeat polling until the inspection order was completed
  system.timer.setTimeout(() => {
    pollInspectionOrderProgress(engine, userTask, _5iInformation);
  }, 10000);
}

module.exports = {
  handle5thIndustryUserTask,
  setup5thIndustryEndpoints,
};
